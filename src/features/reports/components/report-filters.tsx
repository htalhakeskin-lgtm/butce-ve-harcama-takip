"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Select } from "@/components/ui/input";
import type { AccountView } from "@/features/accounts/server";

import { REPORT_PERIODS, type ReportPeriod } from "../periods";

/** Period and account filters; values live in the URL like every other filter (FR-RPT-03). */
export function ReportFilters({
  period,
  accountId,
  accounts,
}: {
  period: ReportPeriod;
  accountId: string;
  accounts: AccountView[];
}) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("parent");
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  const labels: Record<ReportPeriod, string> = {
    "6m": t("last6Months"),
    "12m": t("last12Months"),
    year: t("thisYear"),
  };
  return (
    <div className="mb-4 flex flex-wrap gap-2" aria-busy={pending}>
      <div>
        <label htmlFor="report-period" className="sr-only">
          {t("period")}
        </label>
        <Select
          id="report-period"
          value={period}
          onChange={(e) => update("period", e.target.value)}
          className="w-auto min-w-40"
        >
          {REPORT_PERIODS.map((p) => (
            <option key={p} value={p}>
              {labels[p]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="report-account" className="sr-only">
          {t("account")}
        </label>
        <Select
          id="report-account"
          value={accountId}
          onChange={(e) => update("account", e.target.value)}
          className="w-auto min-w-40"
        >
          <option value="">{t("allAccounts")}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
