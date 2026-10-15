import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import { recordAudit } from "@/features/audit/server";
import type { CategoryKind } from "@/lib/domain-constants";
import { AppError } from "@/lib/result";
import { cleanName, nameKey } from "@/lib/text";
import type { DbOrTx } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import type { ServiceCtx } from "@/server/service-ctx";
import { budgetLimits, categories, transactionLines } from "@/server/db/schema";

import type { CreateCategoryInput, UpdateCategoryInput } from "./schemas";

export type CategoryView = {
  id: string;
  kind: CategoryKind;
  name: string;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  archived: boolean;
  version: number;
};

const UNIQUE = "ux_categories_ledger_kind_parent_name_key";

/** Flat list ordered parents-first by sort order; the client builds the two-level tree. */
export async function listCategories(
  db: DbOrTx,
  ctx: ServiceCtx,
  options: { kind?: CategoryKind; includeArchived?: boolean } = {},
): Promise<CategoryView[]> {
  const rows = await db
    .select({
      id: categories.id,
      kind: categories.kind,
      name: categories.name,
      parentId: categories.parentId,
      icon: categories.icon,
      color: categories.color,
      sortOrder: categories.sortOrder,
      archivedAt: categories.archivedAt,
      version: categories.version,
    })
    .from(categories)
    .where(
      and(
        eq(categories.ledgerId, ctx.ledgerId),
        options.kind ? eq(categories.kind, options.kind) : undefined,
        options.includeArchived ? undefined : isNull(categories.archivedAt),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  return rows.map(({ archivedAt, ...rest }) => ({ ...rest, archived: archivedAt !== null }));
}

async function findCategory(db: DbOrTx, ctx: ServiceCtx, id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.ledgerId, ctx.ledgerId)));
  return row ?? null;
}

async function assertValidParent(
  db: DbOrTx,
  ctx: ServiceCtx,
  parentId: string | null,
  kind: CategoryKind,
  selfId?: string,
): Promise<void> {
  if (!parentId) return;
  if (parentId === selfId) throw new AppError("BR-CAT-001", { field: "parentId" });
  const parent = await findCategory(db, ctx, parentId);
  if (!parent) throw new AppError("notFound", { field: "parentId" });
  if (parent.parentId) throw new AppError("BR-CAT-001", { field: "parentId" });
  if (parent.kind !== kind) throw new AppError("BR-CAT-002", { field: "parentId" });
}

async function nextSortOrder(db: DbOrTx, ctx: ServiceCtx, kind: CategoryKind, parentId: string | null) {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${categories.sortOrder}) + 1, 0)`.mapWith(Number) })
    .from(categories)
    .where(
      and(
        eq(categories.ledgerId, ctx.ledgerId),
        eq(categories.kind, kind),
        parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId),
      ),
    );
  return row?.next ?? 0;
}

export async function createCategory(db: DbOrTx, ctx: ServiceCtx, input: CreateCategoryInput): Promise<{ id: string }> {
  const name = cleanName(input.name);
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ ledgerId: categories.ledgerId })
      .from(categories)
      .where(eq(categories.id, input.id));
    if (existing) {
      if (existing.ledgerId !== ctx.ledgerId) throw new AppError("conflict");
      return { id: input.id };
    }
    await assertValidParent(tx, ctx, input.parentId, input.kind);
    try {
      await tx.insert(categories).values({
        id: input.id,
        ledgerId: ctx.ledgerId,
        kind: input.kind,
        parentId: input.parentId,
        name,
        nameKey: nameKey(name),
        icon: input.icon,
        color: input.color,
        sortOrder: await nextSortOrder(tx, ctx, input.kind, input.parentId),
      });
    } catch (error) {
      if (isUniqueViolation(error, UNIQUE)) throw new AppError("BR-CAT-003", { field: "name" });
      throw error;
    }
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "category",
      entityId: input.id,
      action: "create",
      after: { name, kind: input.kind, parentId: input.parentId },
    });
    return { id: input.id };
  });
}

export async function updateCategory(db: DbOrTx, ctx: ServiceCtx, input: UpdateCategoryInput): Promise<void> {
  const name = cleanName(input.name);
  await db.transaction(async (tx) => {
    const current = await findCategory(tx, ctx, input.id);
    if (!current) throw new AppError("notFound");
    if (current.version !== input.version) throw new AppError("conflict");
    if (input.parentId !== current.parentId) {
      await assertValidParent(tx, ctx, input.parentId, current.kind, current.id);
      if (input.parentId) {
        // BR-CAT-001: a category with children cannot become a child itself.
        const [children] = await tx.select({ n: count() }).from(categories).where(eq(categories.parentId, current.id));
        if ((children?.n ?? 0) > 0) throw new AppError("BR-CAT-001", { field: "parentId" });
      }
    }
    try {
      const updated = await tx
        .update(categories)
        .set({
          name,
          nameKey: nameKey(name),
          parentId: input.parentId,
          icon: input.icon,
          color: input.color,
          ...(input.parentId !== current.parentId
            ? { sortOrder: await nextSortOrder(tx, ctx, current.kind, input.parentId) }
            : {}),
          version: sql`${categories.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(categories.id, input.id), eq(categories.version, input.version)))
        .returning({ id: categories.id });
      if (updated.length === 0) throw new AppError("conflict");
    } catch (error) {
      if (isUniqueViolation(error, UNIQUE)) throw new AppError("BR-CAT-003", { field: "name" });
      throw error;
    }
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "category",
      entityId: input.id,
      action: "update",
      before: { name: current.name, parentId: current.parentId, color: current.color, icon: current.icon },
      after: { name, parentId: input.parentId, color: input.color, icon: input.icon },
    });
  });
}

/** Archiving a parent archives its children too, so no orphan stays selectable. */
export async function setCategoryArchived(db: DbOrTx, ctx: ServiceCtx, id: string, archived: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await findCategory(tx, ctx, id);
    if (!current) throw new AppError("notFound");
    const ids = [id];
    if (!current.parentId) {
      const children = await tx.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id));
      ids.push(...children.map((c) => c.id));
    } else if (!archived) {
      // Unarchiving a child also brings back its archived parent.
      ids.push(current.parentId);
    }
    await tx
      .update(categories)
      .set({ archivedAt: archived ? new Date() : null, version: sql`${categories.version} + 1`, updatedAt: new Date() })
      .where(and(inArray(categories.id, ids), eq(categories.ledgerId, ctx.ledgerId)));
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "category",
      entityId: id,
      action: archived ? "archive" : "unarchive",
    });
  });
}

async function usage(db: DbOrTx, id: string) {
  const [lines] = await db.select({ n: count() }).from(transactionLines).where(eq(transactionLines.categoryId, id));
  const [limits] = await db.select({ n: count() }).from(budgetLimits).where(eq(budgetLimits.categoryId, id));
  const [children] = await db.select({ n: count() }).from(categories).where(eq(categories.parentId, id));
  return { lines: lines?.n ?? 0, budgets: limits?.n ?? 0, children: children?.n ?? 0 };
}

export async function getCategoryUsage(db: DbOrTx, ctx: ServiceCtx, id: string) {
  const current = await findCategory(db, ctx, id);
  if (!current) throw new AppError("notFound");
  return usage(db, id);
}

/** BR-CAT-004: only unused categories without children can be deleted. */
export async function deleteCategory(db: DbOrTx, ctx: ServiceCtx, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await findCategory(tx, ctx, id);
    if (!current) throw new AppError("notFound");
    const used = await usage(tx, id);
    if (used.children > 0) throw new AppError("BR-CAT-004-hasChildren");
    if (used.lines > 0) throw new AppError("BR-CAT-004");
    await tx.delete(categories).where(eq(categories.id, id));
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "category",
      entityId: id,
      action: "delete",
      before: { name: current.name, kind: current.kind },
    });
  });
}

/**
 * BR-CAT-004: moves every line and budget limit of `sourceId` to `targetId`, then deletes the source.
 * When both have a limit for the same month, the target's limit is kept.
 */
export async function mergeCategory(db: DbOrTx, ctx: ServiceCtx, sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) throw new AppError("BR-CAT-004-sameTarget", { field: "targetId" });
  await db.transaction(async (tx) => {
    const source = await findCategory(tx, ctx, sourceId);
    const target = await findCategory(tx, ctx, targetId);
    if (!source || !target) throw new AppError("notFound");
    if (source.kind !== target.kind) throw new AppError("BR-CAT-002", { field: "targetId" });
    const used = await usage(tx, sourceId);
    if (used.children > 0) throw new AppError("BR-CAT-004-hasChildren");

    await tx.update(transactionLines).set({ categoryId: targetId }).where(eq(transactionLines.categoryId, sourceId));

    const sourceLimits = await tx.select().from(budgetLimits).where(eq(budgetLimits.categoryId, sourceId));
    const targetMonths = new Set(
      (
        await tx
          .select({ effectiveFrom: budgetLimits.effectiveFrom })
          .from(budgetLimits)
          .where(eq(budgetLimits.categoryId, targetId))
      ).map((r) => r.effectiveFrom),
    );
    for (const limit of sourceLimits) {
      if (targetMonths.has(limit.effectiveFrom)) {
        await tx.delete(budgetLimits).where(eq(budgetLimits.id, limit.id));
      } else {
        await tx.update(budgetLimits).set({ categoryId: targetId }).where(eq(budgetLimits.id, limit.id));
      }
    }
    await tx.delete(categories).where(eq(categories.id, sourceId));
    await recordAudit(tx, {
      ledgerId: ctx.ledgerId,
      actorId: ctx.userId,
      entityType: "category",
      entityId: sourceId,
      action: "merge",
      before: { name: source.name },
      after: { mergedInto: targetId, targetName: target.name, lines: used.lines },
    });
  });
}

export async function moveCategory(db: DbOrTx, ctx: ServiceCtx, id: string, direction: "up" | "down"): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await findCategory(tx, ctx, id);
    if (!current) throw new AppError("notFound");
    const siblings = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.ledgerId, ctx.ledgerId),
          eq(categories.kind, current.kind),
          current.parentId ? eq(categories.parentId, current.parentId) : isNull(categories.parentId),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
    const index = siblings.findIndex((s) => s.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith]!, reordered[index]!];
    for (const [order, sibling] of reordered.entries()) {
      await tx.update(categories).set({ sortOrder: order }).where(eq(categories.id, sibling.id));
    }
  });
}
