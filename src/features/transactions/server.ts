import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { recordAudit } from "@/features/audit/server";
import { addMonths } from "@/lib/dates";
import { newId } from "@/lib/ids";
import {
  MAX_FUTURE_YEARS,
  MIN_TRANSACTION_DAY,
  PAGE_SIZE,
  type CategoryKind,
  type TransactionType,
} from "@/lib/domain-constants";
import { AppError } from "@/lib/result";
import type { DbOrTx } from "@/server/db";
import { accounts, categories, transactionLines, transactions } from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

import type { CreateTransactionInput, TransactionFilters, TransactionInput, UpdateTransactionInput } from "./schemas";

// ---------------------------------------------------------------------------------------------
// Validation (BR-TRX-001…006)
// ---------------------------------------------------------------------------------------------

type Existing = { accountId: string; toAccountId: string | null; categoryIds: Set<string> } | null;

async function validate(db: DbOrTx, ctx: ServiceCtx, input: TransactionInput, existing: Existing): Promise<void> {
  // BR-TRX-002
  const latest = addMonths(ctx.today, MAX_FUTURE_YEARS * 12);
  if (input.occurredOn < MIN_TRANSACTION_DAY || input.occurredOn > latest) {
    throw new AppError("BR-TRX-002", { field: "occurredOn" });
  }

  const accountIds = [input.accountId, ...(input.toAccountId ? [input.toAccountId] : [])];
  const found = await db
    .select({ id: accounts.id, archivedAt: accounts.archivedAt })
    .from(accounts)
    .where(and(inArray(accounts.id, accountIds), eq(accounts.ledgerId, ctx.ledgerId)));
  const byId = new Map(found.map((a) => [a.id, a]));

  const from = byId.get(input.accountId);
  if (!from) throw new AppError("notFound", { field: "accountId" });
  // BR-TRX-006: archived accounts cannot receive new transactions; an existing value may stay.
  if (from.archivedAt && existing?.accountId !== from.id) throw new AppError("BR-TRX-006", { field: "accountId" });

  if (input.type === "transfer") {
    // BR-TRX-005
    if (!input.toAccountId) throw new AppError("validation", { field: "toAccountId" });
    if (input.toAccountId === input.accountId) throw new AppError("BR-TRX-005", { field: "toAccountId" });
    const to = byId.get(input.toAccountId);
    if (!to) throw new AppError("notFound", { field: "toAccountId" });
    if (to.archivedAt && existing?.toAccountId !== to.id) throw new AppError("BR-TRX-006", { field: "toAccountId" });
    if (input.lines.length > 0) throw new AppError("BR-TRX-005", { field: "lines" });
    return;
  }

  if (input.toAccountId) throw new AppError("BR-TRX-005", { field: "toAccountId" });
  // BR-TRX-004
  if (input.lines.length === 0) throw new AppError("validation", { field: "lines.0.categoryId" });
  const sum = input.lines.reduce((total, line) => total + line.amountMinor, 0);
  if (sum !== input.amountMinor) throw new AppError("BR-TRX-004", { field: "lines" });

  const categoryIds = [...new Set(input.lines.map((l) => l.categoryId))];
  const cats = await db
    .select({ id: categories.id, kind: categories.kind, archivedAt: categories.archivedAt })
    .from(categories)
    .where(and(inArray(categories.id, categoryIds), eq(categories.ledgerId, ctx.ledgerId)));
  if (cats.length !== categoryIds.length) throw new AppError("notFound", { field: "lines.0.categoryId" });
  for (const category of cats) {
    // BR-TRX-003
    if (category.kind !== (input.type as CategoryKind)) throw new AppError("BR-TRX-003", { field: "lines.0.categoryId" });
    if (category.archivedAt && !existing?.categoryIds.has(category.id)) {
      throw new AppError("BR-TRX-006", { field: "lines.0.categoryId" });
    }
  }
}

function snapshotOf(input: TransactionInput) {
  return {
    type: input.type,
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    amountMinor: input.amountMinor,
    occurredOn: input.occurredOn,
    description: input.description,
    note: input.note,
    lines: input.lines.map((l) => ({ categoryId: l.categoryId, amountMinor: l.amountMinor })),
  };
}

async function insertLines(db: DbOrTx, ctx: ServiceCtx, transactionId: string, input: TransactionInput) {
  if (input.type === "transfer" || input.lines.length === 0) return;
  await db.insert(transactionLines).values(
    input.lines.map((line, index) => ({
      id: newId(),
      transactionId,
      ledgerId: ctx.ledgerId,
      categoryId: line.categoryId,
      amountMinor: line.amountMinor,
      sortOrder: index,
    })),
  );
}

// ---------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------

export async function createTransaction(
  db: DbOrTx,
  ctx: ServiceCtx,
  input: CreateTransactionInput,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    // BR-SYS-004: the same id again returns the first result.
    const [existing] = await tx
      .select({ ledgerId: transactions.ledgerId })
      .from(transactions)
      .where(eq(transactions.id, input.id));
    if (existing) {
      if (existing.ledgerId !== ctx.ledgerId) throw new AppError("conflict");
      return { id: input.id };
    }
    await validate(tx, ctx, input, null);
    await tx.insert(transactions).values({
      id: input.id,
      ledgerId: ctx.ledgerId,
      type: input.type,
      accountId: input.accountId,
      toAccountId: input.type === "transfer" ? input.toAccountId : null,
      amountMinor: input.amountMinor,
      occurredOn: input.occurredOn,
      description: input.description,
      note: input.note,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
    await insertLines(tx, ctx, input.id, input);
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "transaction",
      entityId: input.id,
      action: "create",
      after: snapshotOf(input),
    });
    return { id: input.id };
  });
}

export async function updateTransaction(db: DbOrTx, ctx: ServiceCtx, input: UpdateTransactionInput): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await getTransaction(tx, ctx, input.id);
    if (!current || current.deleted) throw new AppError("notFound");
    if (current.version !== input.version) throw new AppError("conflict");

    await validate(tx, ctx, input, {
      accountId: current.accountId,
      toAccountId: current.toAccountId,
      categoryIds: new Set(current.lines.map((l) => l.categoryId)),
    });
    const updated = await tx
      .update(transactions)
      .set({
        type: input.type,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId : null,
        amountMinor: input.amountMinor,
        occurredOn: input.occurredOn,
        description: input.description,
        note: input.note,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: sql`${transactions.version} + 1`,
      })
      .where(and(eq(transactions.id, input.id), eq(transactions.version, input.version)))
      .returning({ id: transactions.id });
    if (updated.length === 0) throw new AppError("conflict");

    await tx.delete(transactionLines).where(eq(transactionLines.transactionId, input.id));
    await insertLines(tx, ctx, input.id, input);
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "transaction",
      entityId: input.id,
      action: "update",
      before: snapshotOf(current),
      after: snapshotOf(input),
    });
  });
}

/** BR-TRX-008: moves the transaction to the trash; it can be restored. */
export async function deleteTransaction(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<void> {
  await setDeleted(db, ctx, id, true);
}

export async function restoreTransaction(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<void> {
  await setDeleted(db, ctx, id, false);
}

async function setDeleted(db: DbOrTx, ctx: ServiceCtx, id: string, deleted: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(transactions)
      .set({
        deletedAt: deleted ? new Date() : null,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: sql`${transactions.version} + 1`,
      })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.ledgerId, ctx.ledgerId),
          deleted ? isNull(transactions.deletedAt) : isNotNull(transactions.deletedAt),
        ),
      )
      .returning({ id: transactions.id });
    if (updated.length === 0) {
      const exists = await getTransaction(tx, ctx, id);
      if (!exists) throw new AppError("notFound");
      return; // already in the requested state
    }
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "transaction",
      entityId: id,
      action: deleted ? "delete" : "restore",
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

export type TransactionDetail = {
  id: string;
  type: TransactionType;
  accountId: string;
  toAccountId: string | null;
  amountMinor: number;
  occurredOn: string;
  description: string;
  note: string;
  version: number;
  deleted: boolean;
  lines: { categoryId: string; amountMinor: number }[];
};

export async function getTransaction(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<TransactionDetail | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ledgerId, ctx.ledgerId)));
  if (!row) return null;
  const lines = await db
    .select({ categoryId: transactionLines.categoryId, amountMinor: transactionLines.amountMinor })
    .from(transactionLines)
    .where(eq(transactionLines.transactionId, id))
    .orderBy(transactionLines.sortOrder);
  return {
    id: row.id,
    type: row.type,
    accountId: row.accountId,
    toAccountId: row.toAccountId,
    amountMinor: row.amountMinor,
    occurredOn: row.occurredOn,
    description: row.description,
    note: row.note,
    version: row.version,
    deleted: row.deletedAt !== null,
    lines,
  };
}

export type TransactionListItem = {
  id: string;
  type: TransactionType;
  amountMinor: number;
  occurredOn: string;
  description: string;
  account: { id: string; name: string };
  toAccount: { id: string; name: string } | null;
  /** First line's category; `lineCount` > 1 means a split transaction. */
  category: { id: string; name: string; icon: string; color: string; parentName: string | null } | null;
  lineCount: number;
};

/** Category filter includes the children of a selected parent (FR-TRX-08). */
async function expandCategoryIds(db: DbOrTx, ctx: ServiceCtx, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.ledgerId, ctx.ledgerId), or(inArray(categories.id, ids), inArray(categories.parentId, ids))),
    );
  return rows.map((r) => r.id);
}

function baseConditions(ctx: ServiceCtx, filters: TransactionFilters): SQL[] {
  const conditions: SQL[] = [eq(transactions.ledgerId, ctx.ledgerId), isNull(transactions.deletedAt)];
  if (filters.from) conditions.push(gte(transactions.occurredOn, filters.from));
  if (filters.to) conditions.push(lte(transactions.occurredOn, filters.to));
  if (filters.types.length > 0) conditions.push(inArray(transactions.type, filters.types));
  if (filters.accountIds.length > 0) {
    conditions.push(
      or(inArray(transactions.accountId, filters.accountIds), inArray(transactions.toAccountId, filters.accountIds))!,
    );
  }
  if (filters.amountMin !== undefined) conditions.push(gte(transactions.amountMinor, filters.amountMin));
  if (filters.amountMax !== undefined) conditions.push(lte(transactions.amountMinor, filters.amountMax));
  return conditions;
}

function categoryCondition(categoryIds: string[]): SQL | undefined {
  if (categoryIds.length === 0) return undefined;
  // Qualified outer reference: see the note in accounts/server.ts balanceSql.
  return sql`exists (select 1 from ${transactionLines} l where l.transaction_id = ${sql.raw(`"transactions"."id"`)} and l.category_id in (${sql.join(
    categoryIds.map((id) => sql`${id}`),
    sql`, `,
  )}))`;
}

export type Cursor = { occurredOn: string; id: string };

export function encodeCursor(cursor: Cursor): string {
  return `${cursor.occurredOn}_${cursor.id}`;
}

export function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  const [occurredOn, id] = value.split("_");
  if (!occurredOn || !id || !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return null;
  return { occurredOn, id };
}

export async function listTransactions(
  db: DbOrTx,
  ctx: ServiceCtx,
  filters: TransactionFilters,
  options: { cursor?: Cursor | null; limit?: number } = {},
): Promise<{ items: TransactionListItem[]; nextCursor: string | null }> {
  const limit = options.limit ?? PAGE_SIZE;
  const categoryIds = await expandCategoryIds(db, ctx, filters.categoryIds);
  if (filters.categoryIds.length > 0 && categoryIds.length === 0) return { items: [], nextCursor: null };

  const conditions = baseConditions(ctx, filters);
  const byCategory = categoryCondition(categoryIds);
  if (byCategory) conditions.push(byCategory);
  if (options.cursor) {
    conditions.push(
      or(
        lt(transactions.occurredOn, options.cursor.occurredOn),
        and(eq(transactions.occurredOn, options.cursor.occurredOn), lt(transactions.id, options.cursor.id)),
      )!,
    );
  }

  const toAccounts = alias(accounts, "to_accounts");
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
      occurredOn: transactions.occurredOn,
      description: transactions.description,
      accountId: accounts.id,
      accountName: accounts.name,
      toAccountId: toAccounts.id,
      toAccountName: toAccounts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const lines = page.length
    ? await db
        .select({
          transactionId: transactionLines.transactionId,
          sortOrder: transactionLines.sortOrder,
          categoryId: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
          parentName: sql<string | null>`(select p.name from ${categories} p where p.id = ${sql.raw(`"categories"."parent_id"`)})`,
        })
        .from(transactionLines)
        .innerJoin(categories, eq(categories.id, transactionLines.categoryId))
        .where(inArray(transactionLines.transactionId, page.map((r) => r.id)))
        .orderBy(transactionLines.sortOrder)
    : [];
  const linesByTransaction = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = linesByTransaction.get(line.transactionId) ?? [];
    list.push(line);
    linesByTransaction.set(line.transactionId, list);
  }

  const items: TransactionListItem[] = page.map((row) => {
    const own = linesByTransaction.get(row.id) ?? [];
    const first = own[0];
    return {
      id: row.id,
      type: row.type,
      amountMinor: row.amountMinor,
      occurredOn: row.occurredOn,
      description: row.description,
      account: { id: row.accountId, name: row.accountName },
      toAccount: row.toAccountId && row.toAccountName ? { id: row.toAccountId, name: row.toAccountName } : null,
      category: first
        ? { id: first.categoryId, name: first.name, icon: first.icon, color: first.color, parentName: first.parentName }
        : null,
      lineCount: own.length,
    };
  });

  const last = page[page.length - 1];
  const nextCursor = rows.length > limit && last ? encodeCursor({ occurredOn: last.occurredOn, id: last.id }) : null;
  return { items, nextCursor };
}

export type TransactionTotals = { incomeMinor: number; expenseMinor: number; count: number };

/**
 * Totals of everything matching the filters, not just the loaded page (UC-09).
 * With a category filter, only the matching lines of split transactions count.
 */
export async function transactionTotals(
  db: DbOrTx,
  ctx: ServiceCtx,
  filters: TransactionFilters,
): Promise<TransactionTotals> {
  const categoryIds = await expandCategoryIds(db, ctx, filters.categoryIds);
  if (filters.categoryIds.length > 0 && categoryIds.length === 0) return { incomeMinor: 0, expenseMinor: 0, count: 0 };

  const conditions = baseConditions(ctx, filters);
  const byCategory = categoryCondition(categoryIds);

  const [sums] = await db
    .select({
      incomeMinor: sql<number>`coalesce(sum(${transactionLines.amountMinor}) filter (where ${transactions.type} = 'income'), 0)`.mapWith(Number),
      expenseMinor: sql<number>`coalesce(sum(${transactionLines.amountMinor}) filter (where ${transactions.type} = 'expense'), 0)`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
    .where(and(...conditions, categoryIds.length ? inArray(transactionLines.categoryId, categoryIds) : undefined));

  const [counted] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(transactions)
    .where(and(...conditions, byCategory));

  return { incomeMinor: sums?.incomeMinor ?? 0, expenseMinor: sums?.expenseMinor ?? 0, count: counted?.count ?? 0 };
}

/** Last used categories for the quick picker (UC-06). */
export async function recentCategoryIds(
  db: DbOrTx,
  ctx: ServiceCtx,
  kind: CategoryKind,
  limit = 6,
): Promise<string[]> {
  const rows = await db
    .select({ id: transactionLines.categoryId, last: sql`max(${transactions.createdAt})` })
    .from(transactionLines)
    .innerJoin(transactions, eq(transactions.id, transactionLines.transactionId))
    .innerJoin(categories, eq(categories.id, transactionLines.categoryId))
    .where(
      and(
        eq(transactions.ledgerId, ctx.ledgerId),
        eq(transactions.type, kind),
        isNull(transactions.deletedAt),
        isNull(categories.archivedAt),
      ),
    )
    .groupBy(transactionLines.categoryId)
    .orderBy(desc(sql`max(${transactions.createdAt})`))
    .limit(limit);
  return rows.map((r) => r.id);
}

/** The account used most recently, the default for a new transaction (UC-06). */
export async function lastUsedAccountId(db: DbOrTx, ctx: ServiceCtx): Promise<string | null> {
  const [row] = await db
    .select({ id: transactions.accountId })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(eq(transactions.ledgerId, ctx.ledgerId), eq(transactions.createdBy, ctx.userId), isNull(accounts.archivedAt)))
    .orderBy(desc(transactions.createdAt))
    .limit(1);
  return row?.id ?? null;
}
