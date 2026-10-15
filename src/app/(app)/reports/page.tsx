import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DistributionChart, type DistributionRow } from "@/components/charts/distribution-chart";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccounts } from "@/features/accounts/server";
import { listCategories } from "@/features/categories/server";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { REPORT_PERIODS, type ReportPeriod } from "@/features/reports/periods";
import { categoryDistribution, monthlySeries } from "@/features/reports/server";
import { addMonthsToMonth, firstDayOfMonth, lastDayOfMonth, monthOf, monthsBetween } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import { cn } from "@/lib/cn";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

type Params = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/** UC-15: monthly income/expense and category distribution (İ-05). */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const ctx = await requireContext();
  const t = await getTranslations("reports");
  const db = getDb();
  const params = await searchParams;

  const period: ReportPeriod = (REPORT_PERIODS as readonly string[]).includes(str(params.period))
    ? (str(params.period) as ReportPeriod)
    : "6m";
  const accountId = isUuid(str(params.account)) ? str(params.account) : "";
  const kind = str(params.kind) === "income" ? "income" : "expense";
  const parentId = isUuid(str(params.parent)) ? str(params.parent) : null;

  const current = monthOf(ctx.today);
  const firstMonth =
    period === "6m"
      ? addMonthsToMonth(current, -5)
      : period === "12m"
        ? addMonthsToMonth(current, -11)
        : `${current.slice(0, 4)}-01`;
  const months = monthsBetween(firstMonth, current);
  const range = { from: firstDayOfMonth(firstMonth), to: lastDayOfMonth(current) };
  const accountOpt = accountId ? { accountId } : {};

  const [series, distribution, accounts, categories] = await Promise.all([
    monthlySeries(db, ctx, months, accountOpt),
    categoryDistribution(db, ctx, { range, kind, parentId, ...accountOpt }),
    listAccounts(db, ctx, { includeArchived: true }),
    listCategories(db, ctx, { includeArchived: true }),
  ]);
  const parent = parentId ? categories.find((c) => c.id === parentId) : undefined;

  const base = new URLSearchParams();
  if (period !== "6m") base.set("period", period);
  if (accountId) base.set("account", accountId);
  const href = (extra: Record<string, string>) => {
    const next = new URLSearchParams(base);
    for (const [k, v] of Object.entries(extra)) next.set(k, v);
    return `/reports?${next.toString()}`;
  };
  const transactionsHref = (categoryId: string) => {
    const next = new URLSearchParams({
      range: "custom",
      from: range.from,
      to: ctx.today < range.to ? ctx.today : range.to,
      category: categoryId,
    });
    if (accountId) next.set("account", accountId);
    return `/transactions?${next.toString()}`;
  };

  const rows: DistributionRow[] = distribution.map((item) => ({
    ...item,
    href: item.hasChildren ? href({ kind, parent: item.categoryId }) : transactionsHref(item.categoryId),
  }));

  return (
    <>
      <PageHeader title={t("title")} />
      <ReportFilters period={period} accountId={accountId} accounts={accounts} />

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("incomeExpense")}</CardTitle>
          </CardHeader>
          <CardBody>
            <IncomeExpenseChart points={series} title={t("incomeExpense")} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex-wrap">
            <CardTitle>{parent ? `${t("distribution")}: ${parent.name}` : t("distribution")}</CardTitle>
            <div role="tablist" aria-label={t("distribution")} className="inline-flex rounded-lg bg-surface-muted p-1">
              {(["expense", "income"] as const).map((k) => (
                <Link
                  key={k}
                  role="tab"
                  aria-selected={kind === k}
                  href={href({ kind: k })}
                  scroll={false}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium",
                    kind === k ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "expense" ? t("expenses") : t("incomes")}
                </Link>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {parent ? (
              <Link
                href={href({ kind })}
                scroll={false}
                className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <ArrowLeft aria-hidden className="size-4" /> {t("backToParent")}
              </Link>
            ) : null}
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <DistributionChart rows={rows} title={t("distribution")} />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
