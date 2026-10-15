"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ColorDot } from "@/components/category-badge";
import { useLedger } from "@/components/ledger-context";
import { groupSmallSlices } from "@/features/budgets/domain";
import { formatMoney, percentOf } from "@/lib/money";

export type DistributionRow = {
  categoryId: string;
  name: string;
  color: string;
  amountMinor: number;
  hasChildren: boolean;
  isParentRemainder: boolean;
  /** Link that drills into this category's children (or the filtered transaction list). */
  href: string;
};

/**
 * Category distribution (FR-RPT-02). The donut groups slices under 3% into "Other" (BR-RPT-004);
 * the table beside it always lists every category by name, so identity never depends on colour
 * (users pick category colours and two categories may share one).
 */
export function DistributionChart({ rows, title }: { rows: DistributionRow[]; title: string }) {
  const t = useTranslations("reports");
  const tcat = useTranslations("categories");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { currencyCode } = useLedger();
  const total = rows.reduce((sum, r) => sum + r.amountMinor, 0);
  const { kept, otherMinor } = groupSmallSlices(rows.map((r) => ({ ...r, id: r.categoryId })));
  const slices = [
    ...kept.map((r) => ({ key: r.categoryId, name: r.name, value: r.amountMinor, color: `var(--cat-${r.color})` })),
    ...(otherMinor > 0 ? [{ key: "other", name: t("other"), value: otherMinor, color: "var(--cat-slate)" }] : []),
  ];

  const label = (row: DistributionRow) => (row.isParentRemainder ? tcat("other", { name: row.name }) : row.name);

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-60" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              stroke="var(--surface)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const item = payload?.[0];
                if (!active || !item) return null;
                const value = Number(item.value);
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
                    <div className="font-medium">{String(item.name)}</div>
                    <div className="tabular text-muted-foreground">
                      {formatMoney(value, currencyCode, locale)} · %{percentOf(value, total)?.toLocaleString("tr-TR")}
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">{tc("total")}</span>
          <span className="text-lg font-semibold">{formatMoney(total, currencyCode, locale)}</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{t("category")}</th>
            <th scope="col">{t("amount")}</th>
            <th scope="col">{t("share")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.categoryId}-${row.isParentRemainder ? "own" : "all"}`}
              className="border-b border-border last:border-0"
            >
              <th scope="row" className="py-0 text-left font-normal">
                <Link
                  href={row.href}
                  className="flex min-h-11 items-center gap-2 py-2 hover:text-accent"
                  {...(row.hasChildren ? { "aria-label": t("drillDown", { name: row.name }) } : {})}
                >
                  <ColorDot color={row.color} />
                  <span className="truncate">{label(row)}</span>
                  {row.hasChildren ? <ChevronRight aria-hidden className="size-4 text-muted-foreground" /> : null}
                </Link>
              </th>
              <td className="tabular py-2 text-right whitespace-nowrap">
                {formatMoney(row.amountMinor, currencyCode, locale)}
              </td>
              <td className="tabular w-16 py-2 text-right text-muted-foreground">
                %{(percentOf(row.amountMinor, total) ?? 0).toLocaleString("tr-TR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
