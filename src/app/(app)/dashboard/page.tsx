import { CirclePlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { BudgetBar } from "@/components/budget-bar";
import { ColorIcon } from "@/components/category-badge";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { EmptyState } from "@/components/empty-state";
import { MoneyText } from "@/components/money-text";
import { MonthPicker, parseMonthParam } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccounts, totalBalance } from "@/features/accounts/server";
import { budgetOverview } from "@/features/budgets/server";
import { monthlySeries } from "@/features/reports/server";
import { AddTransactionButton } from "@/features/transactions/components/add-transaction-button";
import { TransactionRows } from "@/features/transactions/components/transaction-rows";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { listTransactions } from "@/features/transactions/server";
import { addMonthsToMonth, lastDayOfMonth, monthOf, monthsBetween } from "@/lib/dates";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

/** UC-05: total balance, monthly income and expense, remaining budget (İ-02). */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  const t = await getTranslations("dashboard");
  const db = getDb();
  const currentMonth = monthOf(ctx.today);
  const month = parseMonthParam((await searchParams).month, currentMonth);
  // BR-DSH-001: a past month shows the balance at its last day.
  const asOf = month < currentMonth ? lastDayOfMonth(month) : ctx.today;

  const [accounts, overview, series, recent] = await Promise.all([
    listAccounts(db, ctx, { asOf }),
    budgetOverview(db, ctx, month),
    monthlySeries(db, ctx, monthsBetween(addMonthsToMonth(month, -5), month)),
    listTransactions(db, ctx, transactionFiltersSchema.parse({}), { limit: 5 }),
  ]);
  const total = totalBalance(accounts);
  const { flows, overall } = overview;
  const isEmpty = recent.items.length === 0;

  return (
    <>
      <PageHeader title={t("title")} actions={<MonthPicker month={month} basePath="/dashboard" />} />

      {isEmpty ? (
        <Card className="mb-4">
          <EmptyState
            icon={<CirclePlus />}
            title={t("emptyTitle")}
            body={t("emptyBody")}
            action={<AddTransactionButton />}
          />
        </Card>
      ) : null}

      <section aria-label={t("title")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("totalBalance")} hint={t("totalBalanceHint")}>
          <MoneyText minor={total} kind="balance" className={total < 0 ? "text-danger" : undefined} />
        </StatCard>
        <StatCard label={t("income")}>
          <MoneyText minor={flows.incomeMinor} />
        </StatCard>
        <StatCard label={t("expense")}>
          <MoneyText minor={flows.expenseMinor} />
        </StatCard>
        <StatCard label={overall ? t("remainingBudget") : t("incomeMinusExpense")}>
          {overall ? (
            <>
              <MoneyText
                minor={overall.remainingMinor}
                className={overall.status === "over" ? "text-danger" : undefined}
              />
              <div className="mt-2">
                <BudgetBar
                  spentMinor={overall.spentMinor}
                  plannedMinor={overall.plannedMinor}
                  limitMinor={overall.limitMinor}
                  status={overall.status}
                  label={t("remainingBudget")}
                />
              </div>
            </>
          ) : (
            <>
              <MoneyText minor={flows.incomeMinor - flows.expenseMinor} />
              <Link href="/budgets" className="mt-1 block text-sm text-accent hover:underline">
                {t("setBudget")}
              </Link>
            </>
          )}
        </StatCard>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("incomeExpenseChart")}</CardTitle>
          </CardHeader>
          <CardBody>
            <IncomeExpenseChart points={series} compact title={t("incomeExpenseChart")} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("categoryBudgets")}</CardTitle>
            <Link href={`/budgets?month=${month}`} className="text-sm text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardBody>
            {overview.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBudgetCategories")}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {overview.categories.slice(0, 5).map((c) => (
                  <li key={c.categoryId}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <ColorIcon icon={c.icon} color={c.color} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                      <span className="text-sm text-muted-foreground">
                        <MoneyText minor={c.spentMinor + c.plannedMinor} /> / <MoneyText minor={c.limitMinor} />
                      </span>
                    </div>
                    <BudgetBar
                      spentMinor={c.spentMinor}
                      plannedMinor={c.plannedMinor}
                      limitMinor={c.limitMinor}
                      status={c.status}
                      label={c.name}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("accounts")}</CardTitle>
            <Link href="/accounts" className="text-sm text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-border">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <ColorIcon icon={a.icon} color={a.color} size="sm" />
                  <Link href={`/transactions?account=${a.id}`} className="min-w-0 flex-1 truncate hover:text-accent">
                    {a.name}
                  </Link>
                  {a.type === "credit_card" && a.balanceMinor < 0 ? (
                    <span className="text-sm text-muted-foreground">
                      {t("debt")}: <MoneyText minor={-a.balanceMinor} className="font-medium text-foreground" />
                    </span>
                  ) : (
                    <MoneyText minor={a.balanceMinor} className="font-medium" />
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentTransactions")}</CardTitle>
            <Link href="/transactions" className="text-sm text-accent hover:underline">
              {t("allTransactions")}
            </Link>
          </CardHeader>
          <div className="px-1 pb-2 sm:px-2">
            {recent.items.length > 0 ? (
              <TransactionRows items={recent.items} grouped={false} />
            ) : (
              <p className="px-3 pb-3 text-sm text-muted-foreground sm:px-3">{t("emptyBody")}</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function StatCard({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm text-muted-foreground" title={hint}>
        {label}
      </h2>
      <div className="mt-1 text-lg font-semibold sm:text-2xl">{children}</div>
    </Card>
  );
}
