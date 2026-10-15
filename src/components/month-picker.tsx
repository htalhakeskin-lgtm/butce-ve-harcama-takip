import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { addMonthsToMonth, formatMonth, isIsoMonth, type IsoMonth } from "@/lib/dates";

export function parseMonthParam(value: string | string[] | undefined, fallback: IsoMonth): IsoMonth {
  return typeof value === "string" && isIsoMonth(value) ? value : fallback;
}

function hrefFor(basePath: string, params: Record<string, string>, month: IsoMonth): string {
  const search = new URLSearchParams({ ...params, month });
  return `${basePath}?${search.toString()}`;
}

/** ◂ Ekim 2026 ▸ — the month lives in the URL (FR-DSH-04). */
export async function MonthPicker({
  month,
  basePath,
  params = {},
}: {
  month: IsoMonth;
  basePath: string;
  params?: Record<string, string>;
}) {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const linkClass =
    "inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground";
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      <Link
        href={hrefFor(basePath, params, addMonthsToMonth(month, -1))}
        className={linkClass}
        aria-label={t("previousMonth")}
      >
        <ChevronLeft className="size-5" />
      </Link>
      <span className="min-w-32 text-center text-sm font-medium" aria-live="polite">
        {formatMonth(month, locale)}
      </span>
      <Link
        href={hrefFor(basePath, params, addMonthsToMonth(month, 1))}
        className={linkClass}
        aria-label={t("nextMonth")}
      >
        <ChevronRight className="size-5" />
      </Link>
    </div>
  );
}
