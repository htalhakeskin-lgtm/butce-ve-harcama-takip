import { describe, expect, it } from "vitest";

import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  setAccountArchived,
  totalBalance,
  updateAccount,
} from "@/features/accounts/server";
import { setBudgetLimit, effectiveLimits } from "@/features/budgets/server";
import {
  createCategory,
  deleteCategory,
  listCategories,
  mergeCategory,
  setCategoryArchived,
  updateCategory,
} from "@/features/categories/server";
import { createPersonalLedger } from "@/features/ledgers/server";
import { createTransaction } from "@/features/transactions/server";
import { newId } from "@/lib/ids";

import { TODAY, accountId, categoryId, expectCode, makeUser, testDb } from "./helpers";

const db = () => testDb();

function account(overrides: Partial<Parameters<typeof createAccount>[2]> = {}) {
  return {
    id: newId(),
    name: "Banka",
    type: "bank" as const,
    openingBalanceMinor: 2_500_000,
    openingOn: TODAY,
    includeInTotal: true,
    color: "blue" as const,
    creditLimitMinor: null,
    ...overrides,
  };
}

describe("personal ledger (FR-LDG-01, BR-LDG-001, BR-CAT-006)", () => {
  it("creates default categories in Turkish and a cash account", async () => {
    const ctx = await makeUser();
    const categories = await listCategories(db(), ctx);
    expect(categories.filter((c) => c.kind === "expense" && !c.parentId).map((c) => c.name)).toContain("Market");
    const transport = categories.find((c) => c.name === "Ulaşım");
    expect(categories.filter((c) => c.parentId === transport?.id).map((c) => c.name)).toEqual([
      "Yakıt",
      "Toplu taşıma",
      "Taksi",
    ]);
    expect((await listAccounts(db(), ctx)).map((a) => a.name)).toEqual(["Nakit"]);
  });

  it("is idempotent", async () => {
    const ctx = await makeUser();
    const again = await createPersonalLedger(db(), { userId: ctx.userId, locale: "tr", timeZone: "Europe/Istanbul" });
    expect(again).toBe(ctx.ledgerId);
  });
});

describe("accounts", () => {
  it("BR-SYS-004: the same id twice creates one account", async () => {
    const ctx = await makeUser();
    const input = account();
    await createAccount(db(), ctx, input);
    await createAccount(db(), ctx, input);
    expect((await listAccounts(db(), ctx)).filter((a) => a.name === "Banka")).toHaveLength(1);
  });

  it("BR-ACC-005: names are unique per ledger, case-insensitive with Turkish rules", async () => {
    const ctx = await makeUser();
    await createAccount(db(), ctx, account({ name: "İş Bankası" }));
    await expectCode(createAccount(db(), ctx, account({ name: "iş bankası" })), "BR-ACC-005");
    // Another ledger may use the same name.
    const other = await makeUser();
    await createAccount(db(), other, account({ name: "İş Bankası" }));
  });

  it("BR-ACC-001/002/003: balances and net worth", async () => {
    const ctx = await makeUser();
    const bank = account();
    const card = account({
      name: "Kart",
      type: "credit_card",
      openingBalanceMinor: -50_000,
      creditLimitMinor: 5_000_000,
    });
    await createAccount(db(), ctx, bank);
    await createAccount(db(), ctx, card);
    const market = await categoryId(ctx, "Market");
    await createTransaction(db(), ctx, {
      id: newId(),
      type: "expense",
      accountId: card.id,
      toAccountId: null,
      amountMinor: 100_000,
      occurredOn: TODAY,
      description: "",
      note: "",
      lines: [{ categoryId: market, amountMinor: 100_000 }],
    });
    // Planned (future) transactions do not change today's balance.
    await createTransaction(db(), ctx, {
      id: newId(),
      type: "expense",
      accountId: bank.id,
      toAccountId: null,
      amountMinor: 999_00,
      occurredOn: "2026-10-20",
      description: "",
      note: "",
      lines: [{ categoryId: market, amountMinor: 999_00 }],
    });
    const list = await listAccounts(db(), ctx);
    expect(list.find((a) => a.id === card.id)?.balanceMinor).toBe(-150_000);
    expect(list.find((a) => a.id === bank.id)?.balanceMinor).toBe(2_500_000);
    expect(totalBalance(list)).toBe(2_500_000 - 150_000);

    await updateAccount(db(), ctx, { ...card, includeInTotal: false, version: 1 });
    expect(totalBalance(await listAccounts(db(), ctx))).toBe(2_500_000);
  });

  it("BR-SYS-005: a stale version is rejected", async () => {
    const ctx = await makeUser();
    const input = account();
    await createAccount(db(), ctx, input);
    await updateAccount(db(), ctx, { ...input, name: "Banka 2", version: 1 });
    await expectCode(updateAccount(db(), ctx, { ...input, name: "Banka 3", version: 1 }), "conflict");
  });

  it("BR-ACC-004: a used account cannot be deleted but can be archived", async () => {
    const ctx = await makeUser();
    const cash = await accountId(ctx, "Nakit");
    await createTransaction(db(), ctx, {
      id: newId(),
      type: "income",
      accountId: cash,
      toAccountId: null,
      amountMinor: 1000,
      occurredOn: TODAY,
      description: "",
      note: "",
      lines: [{ categoryId: await categoryId(ctx, "Maaş"), amountMinor: 1000 }],
    });
    await expectCode(deleteAccount(db(), ctx, cash), "BR-ACC-004-hasTransactions");
    await setAccountArchived(db(), ctx, cash, true);
    expect(await listAccounts(db(), ctx)).toHaveLength(0);
    expect((await getAccount(db(), ctx, cash))?.archived).toBe(true);

    const unused = account();
    await createAccount(db(), ctx, unused);
    await deleteAccount(db(), ctx, unused.id);
    expect(await getAccount(db(), ctx, unused.id)).toBeNull();
  });

  it("BR-SYS-001: another ledger's account is invisible and untouchable", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const input = account();
    await createAccount(db(), owner, input);
    expect(await getAccount(db(), intruder, input.id)).toBeNull();
    await expectCode(updateAccount(db(), intruder, { ...input, version: 1 }), "notFound");
    await expectCode(setAccountArchived(db(), intruder, input.id, true), "notFound");
    await expectCode(deleteAccount(db(), intruder, input.id), "notFound");
    await expectCode(createAccount(db(), intruder, input), "conflict");
  });
});

describe("categories", () => {
  it("BR-CAT-001: a child cannot have children", async () => {
    const ctx = await makeUser();
    const fuel = await categoryId(ctx, "Yakıt");
    await expectCode(
      createCategory(db(), ctx, {
        id: newId(),
        kind: "expense",
        name: "Benzin",
        parentId: fuel,
        color: "blue",
        icon: "fuel",
      }),
      "BR-CAT-001",
    );
  });

  it("BR-CAT-002: a child has its parent's kind", async () => {
    const ctx = await makeUser();
    const salary = await categoryId(ctx, "Maaş");
    await expectCode(
      createCategory(db(), ctx, {
        id: newId(),
        kind: "expense",
        name: "Prim",
        parentId: salary,
        color: "green",
        icon: "tag",
      }),
      "BR-CAT-002",
    );
  });

  it("BR-CAT-003: names are unique within the same parent and kind", async () => {
    const ctx = await makeUser();
    await expectCode(
      createCategory(db(), ctx, {
        id: newId(),
        kind: "expense",
        name: "MARKET",
        parentId: null,
        color: "green",
        icon: "tag",
      }),
      "BR-CAT-003",
    );
    // The same name is fine as an income category and under another parent.
    await createCategory(db(), ctx, {
      id: newId(),
      kind: "income",
      name: "Market",
      parentId: null,
      color: "green",
      icon: "tag",
    });
    await createCategory(db(), ctx, {
      id: newId(),
      kind: "expense",
      name: "Diğer",
      parentId: await categoryId(ctx, "Ulaşım"),
      color: "blue",
      icon: "tag",
    });
  });

  it("BR-CAT-001: a parent with children cannot be moved under another parent", async () => {
    const ctx = await makeUser();
    const transport = (await listCategories(db(), ctx)).find((c) => c.name === "Ulaşım")!;
    await expectCode(
      updateCategory(db(), ctx, {
        id: transport.id,
        version: transport.version,
        name: transport.name,
        parentId: await categoryId(ctx, "Market"),
        color: "blue",
        icon: transport.icon,
      }),
      "BR-CAT-001",
    );
  });

  it("BR-CAT-004: used categories cannot be deleted; merging moves lines and limits", async () => {
    const ctx = await makeUser();
    const market = await categoryId(ctx, "Market");
    const food = await categoryId(ctx, "Yemek ve Kafe");
    const cash = await accountId(ctx, "Nakit");
    const txId = newId();
    await createTransaction(db(), ctx, {
      id: txId,
      type: "expense",
      accountId: cash,
      toAccountId: null,
      amountMinor: 5000,
      occurredOn: TODAY,
      description: "",
      note: "",
      lines: [{ categoryId: food, amountMinor: 5000 }],
    });
    await setBudgetLimit(db(), ctx, { categoryId: food, month: "2026-10", amountMinor: 10_000, scope: "fromNow" });
    await expectCode(deleteCategory(db(), ctx, food), "BR-CAT-004");
    await expectCode(deleteCategory(db(), ctx, await categoryId(ctx, "Ulaşım")), "BR-CAT-004-hasChildren");

    await mergeCategory(db(), ctx, food, market);
    const categories = await listCategories(db(), ctx, { includeArchived: true });
    expect(categories.some((c) => c.id === food)).toBe(false);
    const limits = await effectiveLimits(db(), ctx, "2026-10");
    expect(limits.get(market)?.amountMinor).toBe(10_000);

    const unused = await categoryId(ctx, "Eğitim");
    await deleteCategory(db(), ctx, unused);
  });

  it("archiving a parent archives its children", async () => {
    const ctx = await makeUser();
    const bills = await categoryId(ctx, "Faturalar");
    await setCategoryArchived(db(), ctx, bills, true);
    const active = await listCategories(db(), ctx);
    expect(active.some((c) => c.name === "Elektrik")).toBe(false);
    await setCategoryArchived(db(), ctx, bills, false);
    expect((await listCategories(db(), ctx)).some((c) => c.name === "Elektrik")).toBe(true);
  });
});
