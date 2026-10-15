import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createPersonalLedger, findPersonalLedgerId } from "@/features/ledgers/server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, todayIn } from "@/lib/dates";
import type { LedgerRole, Theme } from "@/lib/domain-constants";
import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db";
import { ledgerMembers, ledgers } from "@/server/db/schema";

/**
 * Everything a server function needs to know about the caller.
 * Built once per request; every query and action receives it (K-06, K-07).
 */
export type RequestContext = {
  userId: string;
  userName: string;
  email: string;
  locale: string;
  timeZone: string;
  theme: Theme;
  ledgerId: string;
  ledgerName: string;
  currencyCode: string;
  role: LedgerRole;
  /** The user's calendar day (BR-SYS-006). */
  today: string;
};

export const getSessionUser = cache(async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export const getContext = cache(async (): Promise<RequestContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const db = getDb();
  const timeZone =
    typeof user.timeZone === "string" && isValidTimeZone(user.timeZone) ? user.timeZone : DEFAULT_TIME_ZONE;
  const locale = typeof user.locale === "string" ? user.locale : "tr";

  // Faz 6 adds a ledger switcher; until then the personal ledger is always the active one.
  let ledgerId = await findPersonalLedgerId(db, user.id);
  ledgerId ??= await createPersonalLedger(db, { userId: user.id, locale, timeZone });

  const [row] = await db
    .select({ name: ledgers.name, currencyCode: ledgers.currencyCode, role: ledgerMembers.role })
    .from(ledgers)
    .innerJoin(ledgerMembers, eq(ledgerMembers.ledgerId, ledgers.id))
    .where(and(eq(ledgers.id, ledgerId), eq(ledgerMembers.userId, user.id)))
    .limit(1);
  if (!row) return null;

  return {
    userId: user.id,
    userName: user.name,
    email: user.email,
    locale,
    timeZone,
    theme: (["light", "dark", "system"].includes(String(user.theme)) ? user.theme : "system") as Theme,
    ledgerId,
    ledgerName: row.name,
    currencyCode: row.currencyCode,
    role: row.role,
    today: todayIn(timeZone),
  };
});

/** For pages: sends unauthenticated visitors to the login page. */
export async function requireContext(): Promise<RequestContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}
