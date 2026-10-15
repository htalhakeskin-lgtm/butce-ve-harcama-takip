import "server-only";

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

import { recordAudit } from "@/features/audit/server";
import type { AccountType } from "@/lib/domain-constants";
import { AppError } from "@/lib/result";
import { cleanName, nameKey } from "@/lib/text";
import type { DbOrTx } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { accounts, transactions } from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

import type { CreateAccountInput, UpdateAccountInput } from "./schemas";

export type AccountView = {
  id: string;
  name: string;
  type: AccountType;
  openingBalanceMinor: number;
  openingOn: string;
  includeInTotal: boolean;
  color: string;
  icon: string;
  sortOrder: number;
  creditLimitMinor: number | null;
  archived: boolean;
  version: number;
  /** Signed balance as of the given day (BR-ACC-001, BR-ACC-002). */
  balanceMinor: number;
};

/**
 * Signed movement of a transaction for one account: income +, expense −, transfer out −, transfer in +.
 * Only transactions dated on or before `asOf` and not in the trash count (BR-ACC-001).
 */
function balanceSql(asOf: string) {
  // Outer references are written fully qualified: Drizzle drops the table name in single-table selects,
  // and a bare "id" inside the subquery would resolve to the subquery's own table.
  const accountId = sql.raw(`"accounts"."id"`);
  return sql<number>`${accounts.openingBalanceMinor} + coalesce((
      select sum(case when t.type = 'income' then t.amount_minor else -t.amount_minor end)
      from ${transactions} t
      where t.account_id = ${accountId} and t.deleted_at is null and t.occurred_on <= ${asOf}
    ), 0) + coalesce((
      select sum(t.amount_minor)
      from ${transactions} t
      where t.to_account_id = ${accountId} and t.type = 'transfer' and t.deleted_at is null
        and t.occurred_on <= ${asOf}
    ), 0)`.mapWith(Number);
}

const accountColumns = {
  id: accounts.id,
  name: accounts.name,
  type: accounts.type,
  openingBalanceMinor: accounts.openingBalanceMinor,
  openingOn: accounts.openingOn,
  includeInTotal: accounts.includeInTotal,
  color: accounts.color,
  icon: accounts.icon,
  sortOrder: accounts.sortOrder,
  creditLimitMinor: accounts.creditLimitMinor,
  archivedAt: accounts.archivedAt,
  version: accounts.version,
};

type AccountRow = { archivedAt: Date | null; balanceMinor: number } & Omit<AccountView, "archived" | "balanceMinor">;

function toView(row: AccountRow): AccountView {
  const { archivedAt, ...rest } = row;
  return { ...rest, archived: archivedAt !== null };
}

export async function listAccounts(
  db: DbOrTx,
  ctx: ServiceCtx,
  options: { includeArchived?: boolean; asOf?: string } = {},
): Promise<AccountView[]> {
  const rows = await db
    .select({ ...accountColumns, balanceMinor: balanceSql(options.asOf ?? ctx.today) })
    .from(accounts)
    .where(and(eq(accounts.ledgerId, ctx.ledgerId), options.includeArchived ? undefined : isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.sortOrder), asc(accounts.createdAt));
  return rows.map(toView);
}

export async function getAccount(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<AccountView | null> {
  const [row] = await db
    .select({ ...accountColumns, balanceMinor: balanceSql(ctx.today) })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.ledgerId, ctx.ledgerId)))
    .limit(1);
  return row ? toView(row) : null;
}

/** BR-ACC-003: net worth over active accounts that count toward the total. */
export function totalBalance(list: AccountView[]): number {
  return list.filter((a) => !a.archived && a.includeInTotal).reduce((sum, a) => sum + a.balanceMinor, 0);
}

type AccountFields = {
  name: string;
  type: AccountType;
  openingBalanceMinor: number;
  openingOn: string;
  includeInTotal: boolean;
  color: string;
  creditLimitMinor: number | null;
};

function snapshot(input: AccountFields) {
  return {
    name: input.name,
    type: input.type,
    openingBalanceMinor: input.openingBalanceMinor,
    openingOn: input.openingOn,
    includeInTotal: input.includeInTotal,
    color: input.color,
    creditLimitMinor: input.type === "credit_card" ? input.creditLimitMinor : null,
  };
}

export async function createAccount(db: DbOrTx, ctx: ServiceCtx, input: CreateAccountInput): Promise<{ id: string }> {
  const name = cleanName(input.name);
  return db.transaction(async (tx) => {
    // BR-SYS-004: a repeated request with the same id returns the existing record.
    const [existing] = await tx.select({ ledgerId: accounts.ledgerId }).from(accounts).where(eq(accounts.id, input.id));
    if (existing) {
      if (existing.ledgerId !== ctx.ledgerId) throw new AppError("conflict");
      return { id: input.id };
    }
    const [{ next } = { next: 0 }] = await tx
      .select({ next: sql<number>`coalesce(max(${accounts.sortOrder}) + 1, 0)`.mapWith(Number) })
      .from(accounts)
      .where(eq(accounts.ledgerId, ctx.ledgerId));
    const values = snapshot({ ...input, name });
    try {
      await tx.insert(accounts).values({
        id: input.id,
        ledgerId: ctx.ledgerId,
        ...values,
        nameKey: nameKey(name),
        icon: iconFor(input.type),
        sortOrder: next,
      });
    } catch (error) {
      if (isUniqueViolation(error, "ux_accounts_ledger_name_key")) throw new AppError("BR-ACC-005", { field: "name" });
      throw error;
    }
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "account",
      entityId: input.id,
      action: "create",
      after: values,
    });
    return { id: input.id };
  });
}

export async function updateAccount(db: DbOrTx, ctx: ServiceCtx, input: UpdateAccountInput): Promise<void> {
  const name = cleanName(input.name);
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, input.id), eq(accounts.ledgerId, ctx.ledgerId)));
    if (!current) throw new AppError("notFound");
    if (current.version !== input.version) throw new AppError("conflict");

    const values = snapshot({ ...input, name });
    try {
      const updated = await tx
        .update(accounts)
        .set({
          ...values,
          nameKey: nameKey(name),
          icon: iconFor(input.type),
          version: sql`${accounts.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(accounts.id, input.id), eq(accounts.version, input.version)))
        .returning({ id: accounts.id });
      if (updated.length === 0) throw new AppError("conflict");
    } catch (error) {
      if (isUniqueViolation(error, "ux_accounts_ledger_name_key")) throw new AppError("BR-ACC-005", { field: "name" });
      throw error;
    }
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "account",
      entityId: input.id,
      action: "update",
      before: snapshot(current),
      after: values,
    });
  });
}

export async function setAccountArchived(db: DbOrTx, ctx: ServiceCtx, id: string, archived: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(accounts)
      .set({ archivedAt: archived ? new Date() : null, version: sql`${accounts.version} + 1`, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.ledgerId, ctx.ledgerId)))
      .returning({ id: accounts.id });
    if (updated.length === 0) throw new AppError("notFound");
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "account",
      entityId: id,
      action: archived ? "archive" : "unarchive",
    });
  });
}

/** Only an account that was never used can be deleted; otherwise it is archived (BR-ACC-004). */
export async function deleteAccount(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const account = await getAccount(tx, ctx, id);
    if (!account) throw new AppError("notFound");
    const [used] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)))
      .limit(1);
    if (used) throw new AppError("BR-ACC-004-hasTransactions");
    await tx.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.ledgerId, ctx.ledgerId)));
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "account",
      entityId: id,
      action: "delete",
      before: { name: account.name },
    });
  });
}

export async function moveAccount(db: DbOrTx, ctx: ServiceCtx, id: string, direction: "up" | "down"): Promise<void> {
  await db.transaction(async (tx) => {
    const list = await tx
      .select({ id: accounts.id, sortOrder: accounts.sortOrder })
      .from(accounts)
      .where(eq(accounts.ledgerId, ctx.ledgerId))
      .orderBy(asc(accounts.sortOrder), asc(accounts.createdAt));
    const index = list.findIndex((a) => a.id === id);
    if (index < 0) throw new AppError("notFound");
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith]!, reordered[index]!];
    for (const [order, account] of reordered.entries()) {
      await tx.update(accounts).set({ sortOrder: order }).where(eq(accounts.id, account.id));
    }
  });
}

function iconFor(type: AccountType): string {
  switch (type) {
    case "cash":
      return "wallet";
    case "bank":
      return "landmark";
    case "credit_card":
      return "credit-card";
    case "savings":
      return "piggy-bank";
    case "other":
      return "circle-dot";
  }
}
