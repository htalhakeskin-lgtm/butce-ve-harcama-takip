import "server-only";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { listCategories } from "@/features/categories/server";
import { rollUp } from "@/features/budgets/domain";
import { firstDayOfMonth, lastDayOfMonth, type DayRange, type IsoMonth } from "@/lib/dates";
import type { CategoryKind } from "@/lib/domain-constants";
import type { DbOrTx } from "@/server/db";
import { transactionLines, transactions } from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

export type MonthPoint = { month: IsoMonth; incomeMinor: number; expenseMinor: number };

function accountCondition(accountId: string | undefined) {
  if (!accountId) return undefined;
  return or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId));
}

/**
 * Income and expense per month (FR-RPT-01). Only transactions dated up to today count
 * (BR-RPT-002); transfers never count (BR-RPT-001).
 */
export async function monthlySeries(
  db: DbOrTx,
  ctx: ServiceCtx,
  months: IsoMonth[],
  options: { accountId?: string } = {},
): Promise<MonthPoint[]> {
  if (months.length === 0) return [];
  const from = firstDayOfMonth(months[0]!);
  const to = lastDayOfMonth(months[months.length - 1]!);
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
      incomeMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'income'), 0)`.mapWith(
          Number,
        ),
      expenseMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'expense'), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.ledgerId, ctx.ledgerId),
        isNull(transactions.deletedAt),
        sql`${transactions.occurredOn} between ${from} and ${to}`,
        lte(transactions.occurredOn, ctx.today),
        accountCondition(options.accountId),
      ),
    )
    .groupBy(sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return months.map((month) => ({
    month,
    incomeMinor: byMonth.get(month)?.incomeMinor ?? 0,
    expenseMinor: byMonth.get(month)?.expenseMinor ?? 0,
  }));
}

export type DistributionItem = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amountMinor: number;
  hasChildren: boolean;
  /** True for a parent's own lines shown next to its children ("Ulaşım (diğer)", BR-CAT-005). */
  isParentRemainder: boolean;
};

/**
 * Category distribution for a period (FR-RPT-02). Without `parentId` it lists top-level categories
 * with their children rolled in (BR-CAT-007); with `parentId` it lists that parent's children plus
 * the parent's own lines.
 */
export async function categoryDistribution(
  db: DbOrTx,
  ctx: ServiceCtx,
  options: { range: DayRange; kind: CategoryKind; accountId?: string; parentId?: string | null },
): Promise<DistributionItem[]> {
  const to = options.range.to < ctx.today ? options.range.to : ctx.today;
  const [rows, cats] = await Promise.all([
    db
      .select({
        categoryId: transactionLines.categoryId,
        amountMinor: sql<number>`sum(${transactionLines.amountMinor})`.mapWith(Number),
      })
      .from(transactionLines)
      .innerJoin(transactions, eq(transactions.id, transactionLines.transactionId))
      .where(
        and(
          eq(transactions.ledgerId, ctx.ledgerId),
          eq(transactions.type, options.kind),
          isNull(transactions.deletedAt),
          sql`${transactions.occurredOn} between ${options.range.from} and ${to}`,
          accountCondition(options.accountId),
        ),
      )
      .groupBy(transactionLines.categoryId),
    listCategories(db, ctx, { kind: options.kind, includeArchived: true }),
  ]);
  const own = new Map(rows.map((r) => [r.categoryId, r.amountMinor]));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const hasChildren = new Set(cats.filter((c) => c.parentId).map((c) => c.parentId!));

  let items: DistributionItem[];
  if (options.parentId) {
    const parent = byId.get(options.parentId);
    if (!parent) return [];
    items = cats
      .filter((c) => c.parentId === parent.id)
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        amountMinor: own.get(c.id) ?? 0,
        hasChildren: false,
        isParentRemainder: false,
      }));
    const remainder = own.get(parent.id) ?? 0;
    if (remainder > 0) {
      items.push({
        categoryId: parent.id,
        name: parent.name,
        icon: parent.icon,
        color: parent.color,
        amountMinor: remainder,
        hasChildren: false,
        isParentRemainder: true,
      });
    }
  } else {
    const rolled = rollUp(own, cats);
    items = cats
      .filter((c) => c.parentId === null)
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        amountMinor: rolled.get(c.id) ?? 0,
        hasChildren: hasChildren.has(c.id),
        isParentRemainder: false,
      }));
  }
  return items.filter((i) => i.amountMinor > 0).sort((a, b) => b.amountMinor - a.amountMinor);
}
