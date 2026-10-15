"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import type { BudgetStatus } from "@/features/budgets/domain";
import { cn } from "@/lib/cn";

const TONE: Record<BudgetStatus, { bar: string; track: string; text: string }> = {
  ok: { bar: "bg-accent", track: "bg-accent-soft", text: "text-muted-foreground" },
  near: { bar: "bg-warning", track: "bg-warning-soft", text: "text-warning" },
  over: { bar: "bg-danger", track: "bg-danger-soft", text: "text-danger" },
};

/**
 * Budget meter (BR-BUD-006): spent and planned share of the limit. Status is shown with colour,
 * an icon and text together, never colour alone.
 */
export function BudgetBar({
  spentMinor,
  plannedMinor,
  limitMinor,
  status,
  label,
}: {
  spentMinor: number;
  plannedMinor: number;
  limitMinor: number;
  status: BudgetStatus;
  label: string;
}) {
  const t = useTranslations("budgets");
  const tone = TONE[status];
  const spentPct = limitMinor > 0 ? Math.min(100, (spentMinor / limitMinor) * 100) : 0;
  const plannedPct = limitMinor > 0 ? Math.min(100 - spentPct, (plannedMinor / limitMinor) * 100) : 0;
  const Icon = status === "over" ? CircleAlert : status === "near" ? TriangleAlert : CircleCheck;
  const statusText = status === "over" ? t("statusOver") : status === "near" ? t("statusNear") : t("statusOk");

  return (
    <div>
      <div
        className={cn("flex h-2 overflow-hidden rounded-full", tone.track)}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limitMinor}
        aria-valuenow={Math.min(spentMinor + plannedMinor, limitMinor)}
        aria-valuetext={statusText}
      >
        <div className={cn("h-full", tone.bar)} style={{ width: `${spentPct}%` }} />
        {plannedPct > 0 ? (
          <div className={cn("h-full opacity-40", tone.bar)} style={{ width: `${plannedPct}%` }} />
        ) : null}
      </div>
      {status !== "ok" ? (
        <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", tone.text)}>
          <Icon aria-hidden className="size-3.5" />
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
