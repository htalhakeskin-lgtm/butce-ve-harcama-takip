import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { recordAudit } from "@/features/audit/server";
import { listCategories } from "@/features/categories/server";
import { addMonthsToMonth, firstDayOfMonth, lastDayOfMonth, type IsoMonth } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { AppError } from "@/lib/result";
import type { DbOrTx } from "@/server/db";
import { budgetLimits, categories, transactionLines, transactions } from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

import { computeBudget, rollUp, type BudgetComputed } from "./domain";
import type { SetBudgetLimitInput } from "./schemas";

type EffectiveLimit = { amountMinor: number; effectiveFrom: string };

const OVERALL = "overall";

/**
 * Limits in force for a month: for each category (and the overall budget) the latest row whose
 * effective_from is on or before the month (BR-BUD-003). A null amount means "no limit".
 */
export async function effectiveLimits(
  db: DbOrTx,
  ctx: ServiceCtx,
  month: IsoMonth,
): Promise<Map<string, EffectiveLimit>> {
  const rows = await db
    .selectDistinctOn([budgetLimits.categoryId], {
      categoryId: budgetLimits.categoryId,
      amountMinor: budgetLimits.amountMinor,
      effectiveFrom: budgetLimits.effectiveFrom,
    })
    .from(budgetLimits)
    .where(and(eq(budgetLimits.ledgerId, ctx.ledgerId), lte(budgetLimits.effectiveFrom, firstDayOfMonth(month))))
    .orderBy(budgetLimits.categoryId, sql`${budgetLimits.effectiveFrom} desc`);
  const result = new Map<string, EffectiveLimit>();
  for (const row of rows) {
    if (row.amountMinor !== null) {
      result.set(row.categoryId ?? OVERALL, { amountMinor: row.amountMinor, effectiveFrom: row.effectiveFrom });
    }
  }
  return result;
}

async function upsertLimit(
  db: DbOrTx,
  ctx: ServiceCtx,
  categoryId: string | null,
  month: IsoMonth,
  amountMinor: number | null,
): Promise<void> {
  const effectiveFrom = firstDayOfMonth(month);
  await db
    .insert(budgetLimits)
    .values({ id: newId(), ledgerId: ctx.ledgerId, categoryId, amountMinor, effectiveFrom })
    .onConflictDoUpdate({
      target: [budgetLimits.ledgerId, budgetLimits.categoryId, budgetLimits.effectiveFrom],
      set: { amountMinor, updatedAt: new Date() },
    });
}

/**
 * BR-BUD-003: "fromNow" changes the limit for this and later months (until the next explicit row);
 * "thisMonth" also writes next month's row so the previous value continues from then on.
 * Earlier months are never touched.
 */
export async function setBudgetLimit(db: DbOrTx, ctx: ServiceCtx, input: SetBudgetLimitInput): Promise<void> {
  await db.transaction(async (tx) => {
    if (input.categoryId) {
      const [category] = await tx
        .select({ kind: categories.kind })
        .from(categories)
        .where(and(eq(categories.id, input.categoryId), eq(categories.ledgerId, ctx.ledgerId)));
      if (!category) throw new AppError("notFound", { field: "categoryId" });
      // BR-BUD-005: budgets only cover expenses.
      if (category.kind !== "expense") throw new AppError("BR-TRX-003", { field: "categoryId" });
    }
    const key = input.categoryId ?? OVERALL;
    const before = (await effectiveLimits(tx, ctx, input.month)).get(key) ?? null;

    if (input.scope === "thisMonth") {
      const next = addMonthsToMonth(input.month, 1);
      const [nextRow] = await tx
        .select({ id: budgetLimits.id })
        .from(budgetLimits)
        .where(
          and(
            eq(budgetLimits.ledgerId, ctx.ledgerId),
            input.categoryId ? eq(budgetLimits.categoryId, input.categoryId) : isNull(budgetLimits.categoryId),
            eq(budgetLimits.effectiveFrom, firstDayOfMonth(next)),
          ),
        );
      if (!nextRow) await upsertLimit(tx, ctx, input.categoryId, next, before?.amountMinor ?? null);
    }
    await upsertLimit(tx, ctx, input.categoryId, input.month, input.amountMinor);
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "budget_limit",
      entityId: input.categoryId ?? ctx.ledgerId,
      action: "update",
      before: { month: input.month, amountMinor: before?.amountMinor ?? null },
      after: { month: input.month, amountMinor: input.amountMinor, scope: input.scope },
    });
  });
}

export type MonthFlows = {
  incomeMinor: number;
  expenseMinor: number;
  plannedIncomeMinor: number;
  plannedExpenseMinor: number;
};

/**
 * Income and expense of a month, split into realised (dated up to today) and planned (later).
 * Transfers never count (BR-DSH-002).
 */
export async function monthFlows(db: DbOrTx, ctx: ServiceCtx, month: IsoMonth): Promise<MonthFlows> {
  const [row] = await db
    .select({
      incomeMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'income' and ${transactions.occurredOn} <= ${ctx.today}), 0)`.mapWith(
          Number,
        ),
      expenseMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'expense' and ${transactions.occurredOn} <= ${ctx.today}), 0)`.mapWith(
          Number,
        ),
      plannedIncomeMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'income' and ${transactions.occurredOn} > ${ctx.today}), 0)`.mapWith(
          Number,
        ),
      plannedExpenseMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'expense' and ${transactions.occurredOn} > ${ctx.today}), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.ledgerId, ctx.ledgerId),
        isNull(transactions.deletedAt),
        sql`${transactions.occurredOn} between ${firstDayOfMonth(month)} and ${lastDayOfMonth(month)}`,
      ),
    );
  return row ?? { incomeMinor: 0, expenseMinor: 0, plannedIncomeMinor: 0, plannedExpenseMinor: 0 };
}

/** Expense per category for a month, realised and planned separately (lines, so splits count correctly). */
async function expenseByCategory(db: DbOrTx, ctx: ServiceCtx, month: IsoMonth) {
  const rows = await db
    .select({
      categoryId: transactionLines.categoryId,
      spentMinor:
        sql<number>`coalesce(sum(${transactionLines.amountMinor}) filter (where ${transactions.occurredOn} <= ${ctx.today}), 0)`.mapWith(
          Number,
        ),
      plannedMinor:
        sql<number>`coalesce(sum(${transactionLines.amountMinor}) filter (where ${transactions.occurredOn} > ${ctx.today}), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactionLines)
    .innerJoin(transactions, eq(transactions.id, transactionLines.transactionId))
    .where(
      and(
        eq(transactions.ledgerId, ctx.ledgerId),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
        sql`${transactions.occurredOn} between ${firstDayOfMonth(month)} and ${lastDayOfMonth(month)}`,
      ),
    )
    .groupBy(transactionLines.categoryId);
  return {
    spent: new Map(rows.map((r) => [r.categoryId, r.spentMinor])),
    planned: new Map(rows.map((r) => [r.categoryId, r.plannedMinor])),
  };
}

export type CategoryBudgetRow = BudgetComputed & {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  /** The limit was set in an earlier month and continues (BR-BUD-003). */
  carriedOver: boolean;
};

export type BudgetOverview = {
  month: IsoMonth;
  flows: MonthFlows;
  overall: (BudgetComputed & { carriedOver: boolean }) | null;
  categories: CategoryBudgetRow[];
  /** Parents whose children's limits add up to more than their own limit (BR-BUD-004). */
  childSumWarnings: { categoryId: string; name: string; limitMinor: number; childSumMinor: number }[];
};

export async function budgetOverview(db: DbOrTx, ctx: ServiceCtx, month: IsoMonth): Promise<BudgetOverview> {
  const [limits, flows, byCategory, cats] = await Promise.all([
    effectiveLimits(db, ctx, month),
    monthFlows(db, ctx, month),
    expenseByCategory(db, ctx, month),
    listCategories(db, ctx, { kind: "expense", includeArchived: true }),
  ]);
  const spent = rollUp(byCategory.spent, cats);
  const planned = rollUp(byCategory.planned, cats);
  const monthStart = firstDayOfMonth(month);

  const overallLimit = limits.get(OVERALL);
  const overall = overallLimit
    ? {
        ...computeBudget({
          limitMinor: overallLimit.amountMinor,
          spentMinor: flows.expenseMinor,
          plannedMinor: flows.plannedExpenseMinor,
        }),
        carriedOver: overallLimit.effectiveFrom < monthStart,
      }
    : null;

  const rows: CategoryBudgetRow[] = [];
  for (const category of cats) {
    const limit = limits.get(category.id);
    if (!limit) continue;
    rows.push({
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId,
      carriedOver: limit.effectiveFrom < monthStart,
      ...computeBudget({
        limitMinor: limit.amountMinor,
        spentMinor: spent.get(category.id) ?? 0,
        plannedMinor: planned.get(category.id) ?? 0,
      }),
    });
  }

  const childSumWarnings: BudgetOverview["childSumWarnings"] = [];
  for (const parent of rows.filter((r) => r.parentId === null)) {
    const childSumMinor = rows.filter((r) => r.parentId === parent.categoryId).reduce((s, r) => s + r.limitMinor, 0);
    if (childSumMinor > parent.limitMinor) {
      childSumWarnings.push({
        categoryId: parent.categoryId,
        name: parent.name,
        limitMinor: parent.limitMinor,
        childSumMinor,
      });
    }
  }

  rows.sort((a, b) => b.usedPercent - a.usedPercent);
  return { month, flows, overall, categories: rows, childSumWarnings };
}
