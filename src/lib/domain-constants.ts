/**
 * Value sets shared by the database schema, server code and client forms.
 * Kept free of server imports so client bundles can use them.
 */

export const ACCOUNT_TYPES = ["cash", "bank", "credit_card", "savings", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_KINDS = ["expense", "income"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const LEDGER_ROLES = ["owner", "editor", "viewer"] as const;
export type LedgerRole = (typeof LEDGER_ROLES)[number];

/** 12-colour category/account palette (ui standard): users pick from it, never a free colour. */
export const PALETTE = [
  "slate",
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "pink",
] as const;
export type PaletteColor = (typeof PALETTE)[number];

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** BR-TRX-004 */
export const MAX_TRANSACTION_LINES = 20;
/** BR-TRX-007 */
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_NOTE_LENGTH = 2000;
/** BR-TRX-002 */
export const MIN_TRANSACTION_DAY = "2000-01-01";
export const MAX_FUTURE_YEARS = 5;
/** BR-TRX-008 */
export const UNDO_WINDOW_MS = 10_000;
export const PAGE_SIZE = 50;
