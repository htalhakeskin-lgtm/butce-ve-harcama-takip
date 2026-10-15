/**
 * Creates a verified test user with six months of realistic sample data (local development only).
 * Usage: pnpm db:seed            → deneme@example.com / Deneme-Butce-2026
 * Re-running deletes and recreates the user, so the data always starts fresh.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { createAccount, listAccounts } from "@/features/accounts/server";
import { setBudgetLimit } from "@/features/budgets/server";
import { listCategories } from "@/features/categories/server";
import { createPersonalLedger, deleteLedgersOwnedBy } from "@/features/ledgers/server";
import { createTransaction } from "@/features/transactions/server";
import { CURRENT_LEGAL_VERSION } from "@/lib/auth-constants";
import { addMonthsToMonth, daysInMonth, monthOf, todayIn } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { getDb } from "@/server/db";
import { authAccounts, users } from "@/server/db/schema";

export const DEMO_EMAIL = "deneme@example.com";
export const DEMO_PASSWORD = "Deneme-Butce-2026";

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`Refusing to seed a non-local database (${host || "no DATABASE_URL"}).`);
  }
}

/** Small deterministic PRNG so every run produces the same data. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  assertLocalDatabase();
  const db = getDb();
  const timeZone = "Europe/Istanbul";
  const today = todayIn(timeZone);
  const rnd = random(2026);
  const between = (min: number, max: number) => Math.round((min + rnd() * (max - min)) / 50) * 50 * 100;
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)]!;

  // Fresh start: remove a previous demo user and everything it owns.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL));
  if (existing) {
    await deleteLedgersOwnedBy(db, existing.id);
    await db.delete(users).where(eq(users.id, existing.id));
  }

  const userId = newId();
  await db.insert(users).values({
    id: userId,
    name: "Deneme Kullanıcı",
    email: DEMO_EMAIL,
    emailVerified: true,
    locale: "tr",
    timeZone,
    consentVersion: CURRENT_LEGAL_VERSION,
    consentAt: new Date(),
  });
  await db.insert(authAccounts).values({
    id: newId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(DEMO_PASSWORD),
  });
  const ledgerId = await createPersonalLedger(db, { userId, locale: "tr", timeZone });
  const ctx = { userId, ledgerId, today };

  const currentMonth = monthOf(today);
  const firstMonth = addMonthsToMonth(currentMonth, -5);
  const bank = newId();
  const card = newId();
  await createAccount(db, ctx, {
    id: bank,
    name: "Banka",
    type: "bank",
    openingBalanceMinor: 2_000_000,
    openingOn: `${firstMonth}-01`,
    includeInTotal: true,
    color: "blue",
    creditLimitMinor: null,
  });
  await createAccount(db, ctx, {
    id: card,
    name: "Kredi Kartı",
    type: "credit_card",
    openingBalanceMinor: 0,
    openingOn: `${firstMonth}-01`,
    includeInTotal: true,
    color: "red",
    creditLimitMinor: 6_000_000,
  });
  const cash = (await listAccounts(db, ctx)).find((a) => a.type === "cash")!.id;

  const categories = await listCategories(db, ctx);
  const cat = (name: string, kind: "income" | "expense" = "expense") => {
    const found = categories.find((c) => c.name === name && c.kind === kind);
    if (!found) throw new Error(`Category not found: ${name}`);
    return found.id;
  };

  let count = 0;
  async function add(
    type: "income" | "expense",
    account: string,
    category: string,
    amountMinor: number,
    occurredOn: string,
    description: string,
  ) {
    await createTransaction(db, ctx, {
      id: newId(),
      type,
      accountId: account,
      toAccountId: null,
      amountMinor,
      occurredOn,
      description,
      note: "",
      lines: [{ categoryId: cat(category, type), amountMinor }],
    });
    count++;
  }
  async function transfer(from: string, to: string, amountMinor: number, occurredOn: string, description: string) {
    await createTransaction(db, ctx, {
      id: newId(),
      type: "transfer",
      accountId: from,
      toAccountId: to,
      amountMinor,
      occurredOn,
      description,
      note: "",
      lines: [],
    });
    count++;
  }

  for (let i = 0; i < 6; i++) {
    const month = addMonthsToMonth(firstMonth, i);
    const day = (d: number) => `${month}-${String(Math.min(d, daysInMonth(month))).padStart(2, "0")}`;
    const isPast = (d: number) => day(d) <= today;
    const winter = ["11", "12", "01", "02", "03"].includes(month.slice(5));

    if (isPast(1)) await add("income", bank, "Maaş", 4_500_000, day(1), "Maaş");
    if (isPast(3)) await add("expense", bank, "Kira", 1_500_000, day(3), "Ev kirası");
    if (isPast(5)) await transfer(bank, cash, 150_000, day(5), "ATM'den para çekme");
    if (isPast(10)) await add("expense", bank, "Elektrik", between(550, 900), day(10), "Elektrik faturası");
    if (isPast(11))
      await add(
        "expense",
        bank,
        "Doğalgaz",
        winter ? between(1200, 2200) : between(250, 450),
        day(11),
        "Doğalgaz faturası",
      );
    if (isPast(12)) await add("expense", bank, "İnternet", 45_000, day(12), "Ev interneti");
    if (isPast(15)) await add("expense", bank, "Telefon", 35_000, day(15), "Telefon faturası");
    if (isPast(20)) await add("expense", card, "Abonelikler", 27_000, day(20), "Dizi ve müzik abonelikleri");
    if (isPast(25) && i > 0) await transfer(bank, card, 900_000, day(25), "Kredi kartı borcu ödemesi");

    for (const d of [2, 9, 16, 23, 29]) {
      if (isPast(d))
        await add(
          "expense",
          pick([bank, card]),
          "Market",
          between(600, 1900),
          day(d),
          pick(["Migros", "A101", "BİM", "Şok", "CarrefourSA"]),
        );
    }
    for (const d of [4, 7, 13, 18, 21, 27]) {
      if (isPast(d))
        await add(
          "expense",
          card,
          "Yemek ve Kafe",
          between(150, 650),
          day(d),
          pick(["Öğle yemeği", "Kahve", "Akşam yemeği", "Tatlı"]),
        );
    }
    for (const d of [6, 19]) {
      if (isPast(d)) await add("expense", card, "Yakıt", between(1500, 2300), day(d), pick(["Shell", "Opet", "BP"]));
    }
    for (const d of [8, 22]) {
      if (isPast(d)) await add("expense", cash, "Toplu taşıma", between(100, 300), day(d), "İstanbulkart yükleme");
    }
    if (isPast(14))
      await add("expense", card, "Eğlence", between(300, 900), day(14), pick(["Sinema", "Konser", "Bowling"]));
    if (isPast(17) && rnd() > 0.4) await add("expense", card, "Giyim", between(700, 2500), day(17), "Giyim alışverişi");
    if (isPast(24) && rnd() > 0.5) await add("expense", cash, "Taksi", between(150, 400), day(24), "Taksi");
    if (isPast(26) && rnd() > 0.6) await add("expense", card, "Sağlık", between(250, 800), day(26), "Eczane");
  }

  // A planned (future-dated) expense in the current month, so the budget shows "Planlı".
  const plannedDay = `${currentMonth}-${String(daysInMonth(currentMonth)).padStart(2, "0")}`;
  if (plannedDay > today) await add("expense", card, "Hediye", 120_000, plannedDay, "Doğum günü hediyesi");

  await setBudgetLimit(db, ctx, { categoryId: null, month: firstMonth, amountMinor: 3_600_000, scope: "fromNow" });
  await setBudgetLimit(db, ctx, {
    categoryId: cat("Market"),
    month: firstMonth,
    amountMinor: 600_000,
    scope: "fromNow",
  });
  await setBudgetLimit(db, ctx, {
    categoryId: cat("Yemek ve Kafe"),
    month: firstMonth,
    amountMinor: 250_000,
    scope: "fromNow",
  });
  await setBudgetLimit(db, ctx, {
    categoryId: cat("Ulaşım"),
    month: firstMonth,
    amountMinor: 450_000,
    scope: "fromNow",
  });

  console.warn(
    `Demo user ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${count} transactions, ${firstMonth} → ${currentMonth})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
