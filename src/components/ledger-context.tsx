"use client";

import { createContext, use, type ReactNode } from "react";

import type { LedgerRole } from "@/lib/domain-constants";

export type LedgerInfo = {
  currencyCode: string;
  today: string;
  timeZone: string;
  role: LedgerRole;
  userName: string;
  email: string;
};

const LedgerContext = createContext<LedgerInfo | null>(null);

export function LedgerProvider({ value, children }: { value: LedgerInfo; children: ReactNode }) {
  return <LedgerContext value={value}>{children}</LedgerContext>;
}

export function useLedger(): LedgerInfo {
  const value = use(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside LedgerProvider");
  return value;
}
