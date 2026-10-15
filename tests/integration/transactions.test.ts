import { describe, expect, it } from "vitest";

import { createAccount, listAccounts, setAccountArchived } from "@/features/accounts/server";
import { setCategoryArchived } from "@/features/categories/server";
import {
  createTransaction,
  decodeCursor,
  deleteTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  transactionTotals,
  updateTransaction,
} from "@/features/transactions/server";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { newId } from "@/lib/ids";
import type { ServiceCtx } from "@/server/service-ctx";

import { TODAY, accountId, categoryId, expectCode, makeUser, testDb } from "./helpers";

const db = () => testDb();
const filters = (input: Record<string, unknown> = {}) => transactionFiltersSchema.parse(input);

async function expense(ctx: ServiceCtx, overrides: Record<string, unknown> = {}) {
  const input = {
    id: newId(),
    type: "expense" as const,
    accountId: await accountId(ctx, "Nakit"),
    toAccountId: null,
    amountMinor: 125_050,
    occurredOn: TODAY,
    description: "Market",
    note: "",
    lines: [{ categoryId: await categoryId(ctx, "Market"), amountMinor: 125_050 }],
    ...overrides,
  };
  await createTransaction(db(), ctx, input as Parameters<typeof createTransaction>[2]);
  return input;
}

describe("creating transactions", () => {
  it("BR-SYS-004: a repeated request does not create a duplicate", async () => {
    const ctx = await makeUser();
    const input = await expense(ctx);
    await createTransaction(db(), ctx, input);
    expect((await listTransactions(db(), ctx, filters())).items).toHaveLength(1);
  });

  it("BR-TRX-003: the category kind must match the type", async () => {
    const ctx = await makeUser();
    await expectCode(
      expense(ctx, { lines: [{ categoryId: await categoryId(ctx, "Maaş"), amountMinor: 125_050 }] }),
      "BR-TRX-003",
    );
  });

  it("BR-TRX-004: lines must add up to the amount", async () => {
    const ctx = await makeUser();
    await expectCode(
      expense(ctx, { lines: [{ categoryId: await categoryId(ctx, "Market"), amountMinor: 100 }] }),
      "BR-TRX-004",
    );
    // A split transaction whose lines add up is fine.
    await expense(ctx, {
      amountMinor: 100_000,
      lines: [
        { categoryId: await categoryId(ctx, "Market"), amountMinor: 80_000 },
        { categoryId: await categoryId(ctx, "Ev"), amountMinor: 20_000 },
      ],
    });
  });

  it("BR-TRX-005: a transfer needs two different accounts and no category", async () => {
    const ctx = await makeUser();
    const cash = await accountId(ctx, "Nakit");
    await expectCode(
      createTransaction(db(), ctx, {
        id: newId(),
        type: "transfer",
        accountId: cash,
        toAccountId: cash,
        amountMinor: 100,
        occurredOn: TODAY,
        description: "",
        note: "",
        lines: [],
      }),
      "BR-TRX-005",
    );
  });

  it("BR-TRX-002: dates before 2000 or more than five years ahead are rejected", async () => {
    const ctx = await makeUser();
    await expectCode(expense(ctx, { occurredOn: "1999-12-31" }), "BR-TRX-002");
    await expectCode(expense(ctx, { occurredOn: "2031-10-16" }), "BR-TRX-002");
    await expense(ctx, { occurredOn: "2031-10-15" });
  });

  it("BR-TRX-006: archived accounts and categories take no new transactions", async () => {
    const ctx = await makeUser();
    const existing = await expense(ctx);
    await setAccountArchived(db(), ctx, existing.accountId, true);
    await expectCode(expense(ctx), "BR-TRX-006");
    // Editing an existing transaction may keep the archived account.
    await updateTransaction(db(), ctx, { ...existing, description: "Değişti", version: 1 });

    const other = await makeUser();
    await setCategoryArchived(db(), other, await categoryId(other, "Market"), true);
    await expectCode(expense(other), "BR-TRX-006");
  });
});

describe("editing and deleting", () => {
  it("BR-SYS-005: a stale version is rejected", async () => {
    const ctx = await makeUser();
    const input = await expense(ctx);
    await updateTransaction(db(), ctx, {
      ...input,
      amountMinor: 1000,
      lines: [{ ...input.lines[0]!, amountMinor: 1000 }],
      version: 1,
    });
    await expectCode(updateTransaction(db(), ctx, { ...input, version: 1 }), "conflict");
    expect((await getTransaction(db(), ctx, input.id))?.amountMinor).toBe(1000);
  });

  it("BR-TRX-008: deleting moves to the trash and restoring brings the balance back", async () => {
    const ctx = await makeUser();
    const input = await expense(ctx);
    const balance = async () => (await listAccounts(db(), ctx))[0]!.balanceMinor;
    expect(await balance()).toBe(-125_050);
    await deleteTransaction(db(), ctx, input.id);
    expect(await balance()).toBe(0);
    expect((await listTransactions(db(), ctx, filters())).items).toHaveLength(0);
    await restoreTransaction(db(), ctx, input.id);
    expect(await balance()).toBe(-125_050);
  });

  it("BR-SYS-001: another ledger's transaction cannot be read, edited or deleted", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const input = await expense(owner);
    expect(await getTransaction(db(), intruder, input.id)).toBeNull();
    await expectCode(updateTransaction(db(), intruder, { ...input, version: 1 }), "notFound");
    await expectCode(deleteTransaction(db(), intruder, input.id), "notFound");
    await expectCode(createTransaction(db(), intruder, input), "conflict");
    // The intruder cannot point a transaction at the owner's account either.
    await expectCode(
      createTransaction(db(), intruder, {
        ...input,
        id: newId(),
        lines: [{ categoryId: await categoryId(intruder, "Market"), amountMinor: input.amountMinor }],
      }),
      "notFound",
    );
  });
});

describe("listing and filtering (UC-09)", () => {
  it("filters by date range and by a parent category including its children", async () => {
    const ctx = await makeUser();
    await expense(ctx, { occurredOn: "2026-09-30" });
    await expense(ctx, {
      amountMinor: 200_000,
      lines: [{ categoryId: await categoryId(ctx, "Yakıt"), amountMinor: 200_000 }],
    });
    await expense(ctx, {
      amountMinor: 65_000,
      lines: [{ categoryId: await categoryId(ctx, "Elektrik"), amountMinor: 65_000 }],
    });

    const october = filters({ from: "2026-10-01", to: "2026-10-31" });
    expect((await listTransactions(db(), ctx, october)).items).toHaveLength(2);

    const transport = filters({ from: "2026-10-01", to: "2026-10-31", categoryIds: [await categoryId(ctx, "Ulaşım")] });
    const result = await listTransactions(db(), ctx, transport);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.category?.name).toBe("Yakıt");
    expect(result.items[0]?.category?.parentName).toBe("Ulaşım");
    expect(await transactionTotals(db(), ctx, transport)).toEqual({ incomeMinor: 0, expenseMinor: 200_000, count: 1 });
  });

  it("counts only the matching lines of a split transaction in totals", async () => {
    const ctx = await makeUser();
    await expense(ctx, {
      amountMinor: 100_000,
      lines: [
        { categoryId: await categoryId(ctx, "Market"), amountMinor: 80_000 },
        { categoryId: await categoryId(ctx, "Ev"), amountMinor: 20_000 },
      ],
    });
    const totals = await transactionTotals(db(), ctx, filters({ categoryIds: [await categoryId(ctx, "Ev")] }));
    expect(totals.expenseMinor).toBe(20_000);
  });

  it("pages with a cursor, newest first, without gaps or repeats", async () => {
    const ctx = await makeUser();
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) ids.push((await expense(ctx, { occurredOn: `2026-10-0${(i % 3) + 1}` })).id);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof listTransactions>> = await listTransactions(db(), ctx, filters(), {
        cursor: decodeCursor(cursor ?? undefined),
        limit: 3,
      });
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(7);
    expect(seen.sort()).toEqual([...ids].sort());
  });

  it("shows transfers with both accounts and excludes them from totals", async () => {
    const ctx = await makeUser();
    const bank = {
      id: newId(),
      name: "Banka",
      type: "bank" as const,
      openingBalanceMinor: 100_000,
      openingOn: TODAY,
      includeInTotal: true,
      color: "blue" as const,
      creditLimitMinor: null,
    };
    await createAccount(db(), ctx, bank);
    await createTransaction(db(), ctx, {
      id: newId(),
      type: "transfer",
      accountId: bank.id,
      toAccountId: await accountId(ctx, "Nakit"),
      amountMinor: 50_000,
      occurredOn: TODAY,
      description: "",
      note: "",
      lines: [],
    });
    const { items } = await listTransactions(db(), ctx, filters());
    expect(items[0]?.toAccount?.name).toBe("Nakit");
    expect(await transactionTotals(db(), ctx, filters())).toEqual({ incomeMinor: 0, expenseMinor: 0, count: 1 });
  });
});
