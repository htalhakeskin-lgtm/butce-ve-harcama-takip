import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { DEFAULT_CASH_ACCOUNT, DEFAULT_CATEGORIES, DEFAULT_LEDGER_NAME } from "@/features/categories/defaults";
import { todayIn } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { nameKey } from "@/lib/text";
import type { DbOrTx } from "@/server/db";
import { accounts, categories, ledgerMembers, ledgers } from "@/server/db/schema";

type Lang = "tr" | "en";

function lang(locale: string): Lang {
  return locale === "en" ? "en" : "tr";
}

/**
 * Creates the user's personal ledger (BR-LDG-001) with default categories (BR-CAT-006)
 * and a cash account (FR-LDG-01). Idempotent: does nothing if the ledger already exists.
 */
export async function createPersonalLedger(
  db: DbOrTx,
  input: { userId: string; locale: string; timeZone: string; currencyCode?: string },
): Promise<string> {
  const l = lang(input.locale);
  return db.transaction(async (tx) => {
    const existing = await findPersonalLedgerId(tx, input.userId);
    if (existing) return existing;

    const ledgerId = newId();
    await tx.insert(ledgers).values({
      id: ledgerId,
      name: DEFAULT_LEDGER_NAME[l],
      currencyCode: input.currencyCode ?? "TRY",
      kind: "personal",
      createdBy: input.userId,
    });
    await tx.insert(ledgerMembers).values({ ledgerId, userId: input.userId, role: "owner" });

    const rows: (typeof categories.$inferInsert)[] = [];
    for (const kind of ["expense", "income"] as const) {
      DEFAULT_CATEGORIES[kind].forEach((category, index) => {
        const id = newId();
        rows.push({
          id,
          ledgerId,
          kind,
          name: category.name[l],
          nameKey: nameKey(category.name[l]),
          icon: category.icon,
          color: category.color,
          sortOrder: index,
        });
        category.children?.forEach((child, childIndex) => {
          rows.push({
            id: newId(),
            ledgerId,
            parentId: id,
            kind,
            name: child.name[l],
            nameKey: nameKey(child.name[l]),
            icon: child.icon,
            color: child.color,
            sortOrder: childIndex,
          });
        });
      });
    }
    // Parents first, so the self-reference is satisfied within the same statement order.
    await tx.insert(categories).values(rows.filter((r) => !r.parentId));
    await tx.insert(categories).values(rows.filter((r) => r.parentId));

    await tx.insert(accounts).values({
      id: newId(),
      ledgerId,
      name: DEFAULT_CASH_ACCOUNT[l],
      nameKey: nameKey(DEFAULT_CASH_ACCOUNT[l]),
      type: "cash",
      openingBalanceMinor: 0,
      openingOn: todayIn(input.timeZone),
      color: "green",
      icon: "wallet",
    });
    return ledgerId;
  });
}

export async function findPersonalLedgerId(db: DbOrTx, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: ledgers.id })
    .from(ledgers)
    .innerJoin(ledgerMembers, eq(ledgerMembers.ledgerId, ledgers.id))
    .where(and(eq(ledgerMembers.userId, userId), eq(ledgers.kind, "personal")))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Deletes the ledgers a user owns before the user is deleted (BR-AUTH-012).
 * Returns true (and deletes nothing) when the user is the only owner of a shared ledger
 * that still has other members; ownership must be transferred first.
 */
export async function deleteLedgersOwnedBy(db: DbOrTx, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({
        id: ledgers.id,
        kind: ledgers.kind,
        members:
          sql<number>`(select count(*) from ${ledgerMembers} m where m.ledger_id = ${sql.raw(`"ledgers"."id"`)})`.mapWith(
            Number,
          ),
        owners:
          sql<number>`(select count(*) from ${ledgerMembers} m where m.ledger_id = ${sql.raw(`"ledgers"."id"`)} and m.role = 'owner')`.mapWith(
            Number,
          ),
      })
      .from(ledgers)
      .innerJoin(ledgerMembers, eq(ledgerMembers.ledgerId, ledgers.id))
      .where(and(eq(ledgerMembers.userId, userId), eq(ledgerMembers.role, "owner")));

    const blocked = owned.some((l) => l.kind === "shared" && l.members > 1 && l.owners === 1);
    if (blocked) return true;

    for (const ledger of owned) {
      if (ledger.kind === "personal" || ledger.members === 1) {
        await tx.delete(ledgers).where(eq(ledgers.id, ledger.id));
      }
    }
    return false;
  });
}
