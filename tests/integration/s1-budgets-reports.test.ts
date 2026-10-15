import { describe, expect, it } from "vitest";

import { createAccount, listAccounts, totalBalance } from "@/features/accounts/server";
import { budgetOverview, effectiveLimits, setBudgetLimit } from "@/features/budgets/server";
import { categoryDistribution, monthlySeries } from "@/features/reports/server";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  restoreTransaction,
  transactionTotals,
} from "@/features/transactions/server";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { newId } from "@/lib/ids";
import { percentOf } from "@/lib/money";
import type { ServiceCtx } from "@/server/service-ctx";

import { TODAY, accountId, categoryId, makeUser, testDb } from "./helpers";

const db = () => testDb();

async function tx(
  ctx: ServiceCtx,
  type: "income" | "expense",
  account: string,
  category: string,
  amountMinor: number,
  occurredOn = TODAY,
) {
  const id = newId();
  await createTransaction(db(), ctx, {
    id,
    type,
    accountId: account,
    toAccountId: null,
    amountMinor,
    occurredOn,
    description: category,
    note: "",
    lines: [{ categoryId: await categoryId(ctx, category), amountMinor }],
  });
  return id;
}

describe("S1 demo scenario at service level (plan §13.3)", () => {
  it("produces the expected dashboard, filter, report and budget figures", async () => {
    const ctx = await makeUser();
    const bank = newId();
    const card = newId();
    await createAccount(db(), ctx, {
      id: bank,
      name: "Banka",
      type: "bank",
      openingBalanceMinor: 2_500_000,
      openingOn: TODAY,
      includeInTotal: true,
      color: "blue",
      creditLimitMinor: null,
    });
    await createAccount(db(), ctx, {
      id: card,
      name: "Kredi Kartı",
      type: "credit_card",
      openingBalanceMinor: 0,
      openingOn: TODAY,
      includeInTotal: true,
      color: "red",
      creditLimitMinor: 5_000_000,
    });
    const cash = await accountId(ctx, "Nakit");

    await tx(ctx, "income", bank, "Maaş", 4_000_000);
    const market = await tx(ctx, "expense", bank, "Market", 125_050);
    await tx(ctx, "expense", card, "Yakıt", 200_000);
    await tx(ctx, "expense", bank, "Elektrik", 65_000);
    await deleteTransaction(db(), ctx, market);
    await restoreTransaction(db(), ctx, market);
    await createTransaction(db(), ctx, {
      id: newId(),
      type: "transfer",
      accountId: bank,
      toAccountId: cash,
      amountMinor: 100_000,
      occurredOn: TODAY,
      description: "",
      note: "",
      lines: [],
    });
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-10", amountMinor: 2_000_000, scope: "fromNow" });
    await setBudgetLimit(db(), ctx, {
      categoryId: await categoryId(ctx, "Market"),
      month: "2026-10",
      amountMinor: 300_000,
      scope: "fromNow",
    });

    // Step 8: dashboard
    const accounts = await listAccounts(db(), ctx);
    expect(accounts.find((a) => a.id === bank)?.balanceMinor).toBe(6_209_950);
    expect(accounts.find((a) => a.id === cash)?.balanceMinor).toBe(100_000);
    expect(accounts.find((a) => a.id === card)?.balanceMinor).toBe(-200_000);
    expect(totalBalance(accounts)).toBe(6_109_950);
    const overview = await budgetOverview(db(), ctx, "2026-10");
    expect(overview.flows.incomeMinor).toBe(4_000_000);
    expect(overview.flows.expenseMinor).toBe(390_050);
    expect(overview.overall?.remainingMinor).toBe(1_609_950);

    // Step 9: filter by "Ulaşım"
    const filters = transactionFiltersSchema.parse({
      from: "2026-10-01",
      to: "2026-10-31",
      categoryIds: [await categoryId(ctx, "Ulaşım")],
    });
    expect((await listTransactions(db(), ctx, filters)).items).toHaveLength(1);
    expect((await transactionTotals(db(), ctx, filters)).expenseMinor).toBe(200_000);

    // Step 10: reports
    const [october] = await monthlySeries(db(), ctx, ["2026-10"]);
    expect(october).toEqual({ month: "2026-10", incomeMinor: 4_000_000, expenseMinor: 390_050 });
    const distribution = await categoryDistribution(db(), ctx, {
      range: { from: "2026-10-01", to: "2026-10-31" },
      kind: "expense",
    });
    const total = distribution.reduce((s, d) => s + d.amountMinor, 0);
    expect(distribution.map((d) => [d.name, percentOf(d.amountMinor, total)])).toEqual([
      ["Ulaşım", 51.3],
      ["Market", 32.1],
      ["Faturalar", 16.7],
    ]);

    // Step 11: budget screen
    expect(overview.categories.find((c) => c.name === "Market")?.remainingMinor).toBe(174_950);
  });
});

describe("budgets (BR-BUD-002, 003, 004)", () => {
  it("a limit continues into later months until changed", async () => {
    const ctx = await makeUser();
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-08", amountMinor: 1_000_000, scope: "fromNow" });
    expect((await effectiveLimits(db(), ctx, "2026-10")).get("overall")).toEqual({
      amountMinor: 1_000_000,
      effectiveFrom: "2026-08-01",
    });
    expect((await effectiveLimits(db(), ctx, "2026-07")).get("overall")).toBeUndefined();
    expect((await budgetOverview(db(), ctx, "2026-10")).overall?.carriedOver).toBe(true);
  });

  it("'only this month' leaves the next months on the previous limit", async () => {
    const ctx = await makeUser();
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-08", amountMinor: 1_000_000, scope: "fromNow" });
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-10", amountMinor: 1_500_000, scope: "thisMonth" });
    const limits = async (month: string) => (await effectiveLimits(db(), ctx, month)).get("overall")?.amountMinor;
    expect(await limits("2026-09")).toBe(1_000_000);
    expect(await limits("2026-10")).toBe(1_500_000);
    expect(await limits("2026-11")).toBe(1_000_000);
  });

  it("removing a limit from a month on keeps earlier months", async () => {
    const ctx = await makeUser();
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-08", amountMinor: 1_000_000, scope: "fromNow" });
    await setBudgetLimit(db(), ctx, { categoryId: null, month: "2026-10", amountMinor: null, scope: "fromNow" });
    expect((await effectiveLimits(db(), ctx, "2026-09")).get("overall")?.amountMinor).toBe(1_000_000);
    expect((await effectiveLimits(db(), ctx, "2026-10")).get("overall")).toBeUndefined();
  });

  it("separates spent from planned and rolls children into the parent", async () => {
    const ctx = await makeUser();
    const cash = await accountId(ctx, "Nakit");
    await tx(ctx, "expense", cash, "Yakıt", 100_000);
    await tx(ctx, "expense", cash, "Taksi", 20_000, "2026-10-28");
    await setBudgetLimit(db(), ctx, {
      categoryId: await categoryId(ctx, "Ulaşım"),
      month: "2026-10",
      amountMinor: 150_000,
      scope: "fromNow",
    });
    await setBudgetLimit(db(), ctx, {
      categoryId: await categoryId(ctx, "Yakıt"),
      month: "2026-10",
      amountMinor: 120_000,
      scope: "fromNow",
    });
    await setBudgetLimit(db(), ctx, {
      categoryId: await categoryId(ctx, "Taksi"),
      month: "2026-10",
      amountMinor: 50_000,
      scope: "fromNow",
    });
    const overview = await budgetOverview(db(), ctx, "2026-10");
    const transport = overview.categories.find((c) => c.name === "Ulaşım");
    expect(transport).toMatchObject({
      spentMinor: 100_000,
      plannedMinor: 20_000,
      remainingMinor: 30_000,
      status: "near",
    });
    expect(overview.childSumWarnings).toEqual([
      { categoryId: transport?.categoryId, name: "Ulaşım", limitMinor: 150_000, childSumMinor: 170_000 },
    ]);
  });
});

describe("reports", () => {
  it("drills into a parent and shows its own lines as a remainder (BR-CAT-005)", async () => {
    const ctx = await makeUser();
    const cash = await accountId(ctx, "Nakit");
    await tx(ctx, "expense", cash, "Yakıt", 100_000);
    await tx(ctx, "expense", cash, "Ulaşım", 5_000);
    const items = await categoryDistribution(db(), ctx, {
      range: { from: "2026-10-01", to: "2026-10-31" },
      kind: "expense",
      parentId: await categoryId(ctx, "Ulaşım"),
    });
    expect(items.map((i) => [i.name, i.amountMinor, i.isParentRemainder])).toEqual([
      ["Yakıt", 100_000, false],
      ["Ulaşım", 5_000, true],
    ]);
  });

  it("does not count future transactions (BR-RPT-002)", async () => {
    const ctx = await makeUser();
    await tx(ctx, "expense", await accountId(ctx, "Nakit"), "Market", 10_000, "2026-10-30");
    const [october] = await monthlySeries(db(), ctx, ["2026-10"]);
    expect(october?.expenseMinor).toBe(0);
  });
});
