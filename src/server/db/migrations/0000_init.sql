CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"locale" text DEFAULT 'tr' NOT NULL,
	"time_zone" text DEFAULT 'Europe/Istanbul' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"consent_version" text,
	"consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"type" text NOT NULL,
	"opening_balance_minor" bigint DEFAULT 0 NOT NULL,
	"opening_on" date NOT NULL,
	"include_in_total" boolean DEFAULT true NOT NULL,
	"color" text DEFAULT 'slate' NOT NULL,
	"icon" text DEFAULT 'wallet' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"credit_limit_minor" bigint,
	"statement_day" smallint,
	"due_day" smallint,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_accounts_ledger_name_key" UNIQUE("ledger_id","name_key"),
	CONSTRAINT "ck_accounts_type" CHECK ("accounts"."type" in ('cash', 'bank', 'credit_card', 'savings', 'other')),
	CONSTRAINT "ck_accounts_name_length" CHECK (char_length("accounts"."name") between 1 and 60),
	CONSTRAINT "ck_accounts_opening_balance" CHECK (abs("accounts"."opening_balance_minor") <= 100000000000),
	CONSTRAINT "ck_accounts_statement_day" CHECK ("accounts"."statement_day" is null or "accounts"."statement_day" between 1 and 31),
	CONSTRAINT "ck_accounts_due_day" CHECK ("accounts"."due_day" is null or "accounts"."due_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb,
	"actor_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_limits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_id" uuid NOT NULL,
	"category_id" uuid,
	"amount_minor" bigint,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_budget_limits_ledger_category_month" UNIQUE NULLS NOT DISTINCT("ledger_id","category_id","effective_from"),
	CONSTRAINT "ck_budget_limits_amount" CHECK ("budget_limits"."amount_minor" is null or "budget_limits"."amount_minor" > 0),
	CONSTRAINT "ck_budget_limits_first_day" CHECK (extract(day from "budget_limits"."effective_from") = 1)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"icon" text DEFAULT 'tag' NOT NULL,
	"color" text DEFAULT 'slate' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_categories_ledger_kind_parent_name_key" UNIQUE NULLS NOT DISTINCT("ledger_id","kind","parent_id","name_key"),
	CONSTRAINT "ck_categories_kind" CHECK ("categories"."kind" in ('income', 'expense')),
	CONSTRAINT "ck_categories_name_length" CHECK (char_length("categories"."name") between 1 and 40),
	CONSTRAINT "ck_categories_not_own_parent" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "ledger_members" (
	"ledger_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_ledger_members" PRIMARY KEY("ledger_id","user_id"),
	CONSTRAINT "ck_ledger_members_role" CHECK ("ledger_members"."role" in ('owner', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "ledgers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency_code" text DEFAULT 'TRY' NOT NULL,
	"kind" text NOT NULL,
	"created_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ledgers_currency_code" CHECK ("ledgers"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ck_ledgers_kind" CHECK ("ledgers"."kind" in ('personal', 'shared')),
	CONSTRAINT "ck_ledgers_name_length" CHECK (char_length("ledgers"."name") between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "transaction_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" uuid NOT NULL,
	"ledger_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ck_transaction_lines_amount" CHECK ("transaction_lines"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_id" uuid NOT NULL,
	"type" text NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"amount_minor" bigint NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_transactions_type" CHECK ("transactions"."type" in ('income', 'expense', 'transfer')),
	CONSTRAINT "ck_transactions_amount" CHECK ("transactions"."amount_minor" > 0 and "transactions"."amount_minor" <= 100000000000),
	CONSTRAINT "ck_transactions_transfer_accounts" CHECK (("transactions"."type" = 'transfer' and "transactions"."to_account_id" is not null and "transactions"."to_account_id" <> "transactions"."account_id")
          or ("transactions"."type" <> 'transfer' and "transactions"."to_account_id" is null)),
	CONSTRAINT "ck_transactions_description_length" CHECK (char_length("transactions"."description") <= 200),
	CONSTRAINT "ck_transactions_note_length" CHECK (char_length("transactions"."note") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_auth_accounts_user_id" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_verifications_identifier" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "ix_audit_events_entity" ON "audit_events" USING btree ("ledger_id","entity_type","entity_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_audit_events_actor_id" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "ix_budget_limits_category_id" ON "budget_limits" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_categories_parent_id" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_members_user_id" ON "ledger_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_ledgers_created_by" ON "ledgers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ix_transaction_lines_transaction_id" ON "transaction_lines" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ix_transaction_lines_ledger_category" ON "transaction_lines" USING btree ("ledger_id","category_id");--> statement-breakpoint
CREATE INDEX "ix_transaction_lines_category_id" ON "transaction_lines" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_transactions_ledger_occurred" ON "transactions" USING btree ("ledger_id","occurred_on" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_transactions_account_occurred" ON "transactions" USING btree ("account_id","occurred_on");--> statement-breakpoint
CREATE INDEX "ix_transactions_to_account_occurred" ON "transactions" USING btree ("to_account_id","occurred_on");--> statement-breakpoint
CREATE INDEX "ix_transactions_created_by" ON "transactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ix_transactions_updated_by" ON "transactions" USING btree ("updated_by");