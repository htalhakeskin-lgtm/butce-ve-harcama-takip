import { Receipt, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { MoneyText } from "@/components/money-text";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listAccounts } from "@/features/accounts/server";
import { listCategories } from "@/features/categories/server";
import { AddTransactionButton } from "@/features/transactions/components/add-transaction-button";
import { FilterBar } from "@/features/transactions/components/filter-bar";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { listTransactions, transactionTotals } from "@/features/transactions/server";
import { activeFilterCount, buildSearch, parseUrlFilters, toServiceFilters } from "@/features/transactions/url-filters";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("transactions");
  return { title: t("title") };
}

/** UC-09: list, filter and total transactions (İ-03, İ-06). */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  const t = await getTranslations("transactions");
  const db = getDb();
  const urlFilters = parseUrlFilters(await searchParams);
  const filters = toServiceFilters(urlFilters, ctx.today);

  const [page, totals, accounts, categories] = await Promise.all([
    listTransactions(db, ctx, filters),
    transactionTotals(db, ctx, filters),
    listAccounts(db, ctx, { includeArchived: true }),
    listCategories(db, ctx, { includeArchived: true }),
  ]);
  const filtered = activeFilterCount(urlFilters) > 0 || urlFilters.range !== "thisMonth";

  return (
    <>
      <PageHeader title={t("title")} actions={<AddTransactionButton className="hidden lg:inline-flex" />} />
      <FilterBar filters={urlFilters} accounts={accounts} categories={categories} />

      <Card className="mb-4 grid grid-cols-3 divide-x divide-border" aria-live="polite">
        <Total label={t("totals.income")}>
          <MoneyText minor={totals.incomeMinor} kind="income" />
        </Total>
        <Total label={t("totals.expense")}>
          <MoneyText minor={totals.expenseMinor} />
        </Total>
        <Total label={`${t("totals.net")} · ${t("totals.count", { count: totals.count })}`}>
          <MoneyText minor={totals.incomeMinor - totals.expenseMinor} />
        </Total>
      </Card>

      {page.items.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={<SearchX />}
              title={t("noResultsTitle")}
              action={
                <Link href="/transactions" className={buttonVariants({ variant: "secondary" })}>
                  {t("filters.clear")}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Receipt />}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={<AddTransactionButton />}
            />
          )}
        </Card>
      ) : (
        <TransactionList
          key={buildSearch(urlFilters)}
          initialItems={page.items}
          initialCursor={page.nextCursor}
          filters={filters}
        />
      )}
    </>
  );
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-5">
      <div className="truncate text-xs text-muted-foreground sm:text-sm">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold sm:text-lg">{children}</div>
    </div>
  );
}
