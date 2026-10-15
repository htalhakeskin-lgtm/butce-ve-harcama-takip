import "server-only";

import { newId } from "@/lib/ids";
import type { DbOrTx } from "@/server/db";
import { auditEvents } from "@/server/db/schema";

export type AuditAction = "create" | "update" | "delete" | "restore" | "archive" | "unarchive" | "merge";
export type AuditEntity = "transaction" | "account" | "category" | "budget_limit" | "ledger";

type Snapshot = Record<string, unknown>;

/** Field-level diff between two snapshots; only changed fields are kept. */
export function diff(before: Snapshot | null, after: Snapshot | null): Record<string, { from: unknown; to: unknown }> {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    const from = before?.[key] ?? null;
    const to = after?.[key] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}

/**
 * Appends an entry to the change history (BR-AUD-001). Must run in the same database
 * transaction as the change it records. Never pass secrets (BR-AUD-003).
 */
export async function recordAudit(
  db: DbOrTx,
  input: {
    ledgerId: string;
    actorId: string;
    entityType: AuditEntity;
    entityId: string;
    action: AuditAction;
    before?: Snapshot | null;
    after?: Snapshot | null;
  },
): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId(),
    ledgerId: input.ledgerId,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changes: diff(input.before ?? null, input.after ?? null),
  });
}
