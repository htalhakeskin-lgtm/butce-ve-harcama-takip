import type { LedgerRole } from "./domain-constants";

/**
 * Ledger role ranks (plan §5.2). The single source used by action wrappers and the UI
 * (security standard: one permissions file).
 */
const ROLE_RANK: Record<LedgerRole, number> = { viewer: 1, editor: 2, owner: 3 };

export function hasRole(role: LedgerRole, minimum: LedgerRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const can = {
  view: (role: LedgerRole) => hasRole(role, "viewer"),
  edit: (role: LedgerRole) => hasRole(role, "editor"),
  manageLedger: (role: LedgerRole) => hasRole(role, "owner"),
};
