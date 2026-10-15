import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { recordAudit } from "@/features/audit/server";
import { listAccounts } from "@/features/accounts/server";
import { listCategories } from "@/features/categories/server";
import { AppError } from "@/lib/result";
import type { Theme } from "@/lib/domain-constants";
import type { DbOrTx } from "@/server/db";
import { budgetLimits, ledgerMembers, ledgers, transactionLines, transactions, users } from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

export async function updatePreferences(
  db: DbOrTx,
  ctx: ServiceCtx,
  input: { theme?: Theme; timeZone?: string },
): Promise<void> {
  await db
    .update(users)
    .set({
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.timeZone ? { timeZone: input.timeZone } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, ctx.userId));
}

/** BR-LDG-005: the currency can only change while the ledger has no transactions. */
export async function updateLedgerCurrency(db: DbOrTx, ctx: ServiceCtx, currencyCode: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [used] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.ledgerId, ctx.ledgerId))
      .limit(1);
    if (used) throw new AppError("BR-LDG-005", { field: "currencyCode" });
    const [before] = await tx
      .select({ currencyCode: ledgers.currencyCode })
      .from(ledgers)
      .where(eq(ledgers.id, ctx.ledgerId));
    await tx.update(ledgers).set({ currencyCode, updatedAt: new Date() }).where(eq(ledgers.id, ctx.ledgerId));
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "ledger",
      entityId: ctx.ledgerId,
      action: "update",
      before: { currencyCode: before?.currencyCode },
      after: { currencyCode },
    });
  });
}

export async function ledgerHasTransactions(db: DbOrTx, ledgerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.ledgerId, ledgerId))
    .limit(1);
  return Boolean(row);
}

/**
 * BR-PRV-002 / UC-35: everything the user owns, as JSON. Only ledgers the user owns are included,
 * so another person's personal data never ends up in the file.
 */
export async function exportUserData(db: DbOrTx, userId: string, today: string) {
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      locale: users.locale,
      timeZone: users.timeZone,
      consentVersion: users.consentVersion,
      consentAt: users.consentAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new AppError("notFound");

  const owned = await db
    .select({
      id: ledgers.id,
      name: ledgers.name,
      kind: ledgers.kind,
      currencyCode: ledgers.currencyCode,
      createdAt: ledgers.createdAt,
    })
    .from(ledgers)
    .innerJoin(ledgerMembers, eq(ledgerMembers.ledgerId, ledgers.id))
    .where(and(eq(ledgerMembers.userId, userId), eq(ledgerMembers.role, "owner")));

  const result = [];
  for (const ledger of owned) {
    const ctx = { userId, ledgerId: ledger.id, today };
    const [accounts, categories, txRows, limits] = await Promise.all([
      listAccounts(db, ctx, { includeArchived: true }),
      listCategories(db, ctx, { includeArchived: true }),
      db.select().from(transactions).where(eq(transactions.ledgerId, ledger.id)).orderBy(transactions.occurredOn),
      db.select().from(budgetLimits).where(eq(budgetLimits.ledgerId, ledger.id)),
    ]);
    const lines = txRows.length
      ? await db
          .select()
          .from(transactionLines)
          .where(
            inArray(
              transactionLines.transactionId,
              txRows.map((t) => t.id),
            ),
          )
      : [];
    result.push({
      ...ledger,
      accounts: accounts.map(({ version: _v, ...a }) => a),
      categories: categories.map(({ version: _v, ...c }) => c),
      transactions: txRows.map((t) => ({
        id: t.id,
        type: t.type,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
        amountMinor: t.amountMinor,
        occurredOn: t.occurredOn,
        description: t.description,
        note: t.note,
        inTrash: t.deletedAt !== null,
        createdAt: t.createdAt,
        lines: lines
          .filter((l) => l.transactionId === t.id)
          .map((l) => ({ categoryId: l.categoryId, amountMinor: l.amountMinor })),
      })),
      budgetLimits: limits.map((l) => ({
        categoryId: l.categoryId,
        amountMinor: l.amountMinor,
        effectiveFrom: l.effectiveFrom,
      })),
    });
  }

  return {
    format: "butce-takip-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "Amounts are in minor units (kuruş): 125050 = 1.250,50.",
    user,
    ledgers: result,
  };
}
