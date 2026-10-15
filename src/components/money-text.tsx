"use client";

import { useLocale } from "next-intl";

import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

import { useLedger } from "./ledger-context";

type MoneyTextProps = {
  minor: number;
  /**
   * income: green with "+"; expense: normal colour with "−" (K-15: red is only for problems);
   * balance: signed, red only when negative is a problem is decided by the caller.
   */
  kind?: "income" | "expense" | "neutral" | "balance";
  className?: string;
  currency?: string;
};

export function MoneyText({ minor, kind = "neutral", className, currency }: MoneyTextProps) {
  const locale = useLocale();
  const ledger = useLedger();
  const code = currency ?? ledger.currencyCode;
  const value = kind === "expense" ? -Math.abs(minor) : kind === "income" ? Math.abs(minor) : minor;
  return (
    <span className={cn("tabular whitespace-nowrap", kind === "income" && "text-income", className)}>
      {formatMoney(value, code, locale, { signed: kind === "income" })}
    </span>
  );
}
