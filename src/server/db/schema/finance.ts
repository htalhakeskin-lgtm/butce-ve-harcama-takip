import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { ACCOUNT_TYPES, CATEGORY_KINDS, TRANSACTION_TYPES } from "@/lib/domain-constants";

import { users } from "./auth";

export type { AccountType, CategoryKind, TransactionType } from "@/lib/domain-constants";

/**
 * Finance tables (plan §7, database standard).
 * - Every tenant table carries ledger_id (K-06).
 * - Amounts are bigint minor units, always positive; direction comes from the type (ADR-0005).
 * - Calendar days are `date` strings (YYYY-MM-DD); instants are timestamptz.
 * - Value sets are text + CHECK instead of PostgreSQL enums.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const MAX_AMOUNT_MINOR = 100_000_000_000; // BR-SYS-007: 1.000.000.000,00

export const ledgers = pgTable(
  "ledgers",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    currencyCode: text("currency_code").notNull().default("TRY"),
    kind: text("kind", { enum: ["personal", "shared"] }).notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index("ix_ledgers_created_by").on(t.createdBy),
    check("ck_ledgers_currency_code", sql`${t.currencyCode} ~ '^[A-Z]{3}$'`),
    check("ck_ledgers_kind", sql`${t.kind} in ('personal', 'shared')`),
    check("ck_ledgers_name_length", sql`char_length(${t.name}) between 1 and 60`),
  ],
);

export const ledgerMembers = pgTable(
  "ledger_members",
  {
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "pk_ledger_members", columns: [t.ledgerId, t.userId] }),
    index("ix_ledger_members_user_id").on(t.userId),
    check("ck_ledger_members_role", sql`${t.role} in ('owner', 'editor', 'viewer')`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
    /** Signed balance on opening day. A credit card debt is stored negative (BR-ACC-002). */
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" }).notNull().default(0),
    openingOn: date("opening_on", { mode: "string" }).notNull(),
    includeInTotal: boolean("include_in_total").notNull().default(true),
    color: text("color").notNull().default("slate"),
    icon: text("icon").notNull().default("wallet"),
    sortOrder: integer("sort_order").notNull().default(0),
    creditLimitMinor: bigint("credit_limit_minor", { mode: "number" }),
    statementDay: smallint("statement_day"),
    dueDay: smallint("due_day"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique("ux_accounts_ledger_name_key").on(t.ledgerId, t.nameKey),
    check(
      "ck_accounts_type",
      sql`${t.type} in ('cash', 'bank', 'credit_card', 'savings', 'other')`,
    ),
    check("ck_accounts_name_length", sql`char_length(${t.name}) between 1 and 60`),
    check(
      "ck_accounts_opening_balance",
      sql`abs(${t.openingBalanceMinor}) <= ${sql.raw(String(MAX_AMOUNT_MINOR))}`,
    ),
    check("ck_accounts_statement_day", sql`${t.statementDay} is null or ${t.statementDay} between 1 and 31`),
    check("ck_accounts_due_day", sql`${t.dueDay} is null or ${t.dueDay} between 1 and 31`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "no action",
    }),
    kind: text("kind", { enum: CATEGORY_KINDS }).notNull(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    icon: text("icon").notNull().default("tag"),
    color: text("color").notNull().default("slate"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique("ux_categories_ledger_kind_parent_name_key")
      .on(t.ledgerId, t.kind, t.parentId, t.nameKey)
      .nullsNotDistinct(),
    index("ix_categories_parent_id").on(t.parentId),
    check("ck_categories_kind", sql`${t.kind} in ('income', 'expense')`),
    check("ck_categories_name_length", sql`char_length(${t.name}) between 1 and 40`),
    check("ck_categories_not_own_parent", sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "no action" }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, { onDelete: "no action" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    description: text("description").notNull().default(""),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index("ix_transactions_ledger_occurred").on(t.ledgerId, t.occurredOn.desc(), t.id.desc()),
    index("ix_transactions_account_occurred").on(t.accountId, t.occurredOn),
    index("ix_transactions_to_account_occurred").on(t.toAccountId, t.occurredOn),
    index("ix_transactions_created_by").on(t.createdBy),
    index("ix_transactions_updated_by").on(t.updatedBy),
    check("ck_transactions_type", sql`${t.type} in ('income', 'expense', 'transfer')`),
    check(
      "ck_transactions_amount",
      sql`${t.amountMinor} > 0 and ${t.amountMinor} <= ${sql.raw(String(MAX_AMOUNT_MINOR))}`,
    ),
    check(
      "ck_transactions_transfer_accounts",
      sql`(${t.type} = 'transfer' and ${t.toAccountId} is not null and ${t.toAccountId} <> ${t.accountId})
          or (${t.type} <> 'transfer' and ${t.toAccountId} is null)`,
    ),
    check("ck_transactions_description_length", sql`char_length(${t.description}) <= 200`),
    check("ck_transactions_note_length", sql`char_length(${t.note}) <= 2000`),
  ],
);

export const transactionLines = pgTable(
  "transaction_lines",
  {
    id: uuid("id").primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "no action" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    note: text("note").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("ix_transaction_lines_transaction_id").on(t.transactionId),
    index("ix_transaction_lines_ledger_category").on(t.ledgerId, t.categoryId),
    index("ix_transaction_lines_category_id").on(t.categoryId),
    check("ck_transaction_lines_amount", sql`${t.amountMinor} > 0`),
  ],
);

export const budgetLimits = pgTable(
  "budget_limits",
  {
    id: uuid("id").primaryKey(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    /** Null = overall monthly budget. */
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    /** Null = "no limit from this month on" (removes an earlier limit). */
    amountMinor: bigint("amount_minor", { mode: "number" }),
    /** First day of the month the limit starts (BR-BUD-003). */
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique("ux_budget_limits_ledger_category_month")
      .on(t.ledgerId, t.categoryId, t.effectiveFrom)
      .nullsNotDistinct(),
    index("ix_budget_limits_category_id").on(t.categoryId),
    check("ck_budget_limits_amount", sql`${t.amountMinor} is null or ${t.amountMinor} > 0`),
    check("ck_budget_limits_first_day", sql`extract(day from ${t.effectiveFrom}) = 1`),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes").$type<Record<string, { from: unknown; to: unknown }>>(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_audit_events_entity").on(t.ledgerId, t.entityType, t.entityId, t.occurredAt.desc()),
    index("ix_audit_events_actor_id").on(t.actorId),
  ],
);
