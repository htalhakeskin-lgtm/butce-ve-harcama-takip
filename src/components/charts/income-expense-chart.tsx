"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useLedger } from "@/components/ledger-context";
import { formatDay, formatMonth, type IsoMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type MonthPoint = { month: IsoMonth; incomeMinor: number; expenseMinor: number };

type Props = {
  points: MonthPoint[];
  /** Compact variant for the dashboard: no y-axis, smaller height. */
  compact?: boolean;
  title: string;
};

function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Monthly income vs expense (FR-RPT-01). Two series → legend always shown (dataviz rules);
 * thin bars with 4px rounded ends and a 2px gap; hover tooltip; table view (FR-RPT-04).
 */
export function IncomeExpenseChart({ points, compact = false, title }: Props) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const { currencyCode } = useLedger();
  const [asTable, setAsTable] = useState(false);
  const data = points.map((p) => ({
    ...p,
    label: formatDay(`${p.month}-01`, locale, "monthShort"),
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground" aria-hidden={asTable}>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-chart-income" /> {td("income")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-chart-expense" /> {td("expense")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-sm text-accent underline-offset-4 hover:underline"
        >
          {asTable ? tc("showAsChart") : tc("showAsTable")}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="py-2 font-medium">
                  {t("month")}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {td("income")}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {td("expense")}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.month} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2 text-left font-normal">
                    {formatMonth(p.month, locale)}
                  </th>
                  <td className="tabular py-2 text-right">{formatMoney(p.incomeMinor, currencyCode, locale)}</td>
                  <td className="tabular py-2 text-right">{formatMoney(p.expenseMinor, currencyCode, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={compact ? "h-40" : "h-64 sm:h-72"} role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barGap={2}
              barCategoryGap="28%"
              margin={{ top: 4, right: 4, bottom: 0, left: compact ? 4 : 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              {compact ? null : (
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v: number) => compactNumber(v, locale)}
                />
              )}
              <Tooltip
                cursor={{ fill: "var(--surface-muted)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (MonthPoint & { label: string }) | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
                      <div className="mb-1 font-medium">{formatMonth(point.month, locale)}</div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm bg-chart-income" />
                        <span className="text-muted-foreground">{td("income")}</span>
                        <span className="tabular ml-auto pl-4">
                          {formatMoney(point.incomeMinor, currencyCode, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm bg-chart-expense" />
                        <span className="text-muted-foreground">{td("expense")}</span>
                        <span className="tabular ml-auto pl-4">
                          {formatMoney(point.expenseMinor, currencyCode, locale)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="incomeMinor"
                fill="var(--chart-income)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenseMinor"
                fill="var(--chart-expense)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
