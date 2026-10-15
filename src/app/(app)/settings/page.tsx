import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { demoAccount } from "@/env";
import { SettingsPanels } from "@/features/settings/components/settings-panels";
import { ledgerHasTransactions } from "@/features/settings/server";
import { can } from "@/lib/permissions";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

const COMMON_TIME_ZONES = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "America/New_York",
  "Asia/Dubai",
  "UTC",
];

export default async function SettingsPage() {
  const ctx = await requireContext();
  const t = await getTranslations("settings");
  const currencyLocked = await ledgerHasTransactions(getDb(), ctx.ledgerId);
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : COMMON_TIME_ZONES;
  const timeZones = [...new Set([ctx.timeZone, ...COMMON_TIME_ZONES, ...supported])];
  return (
    <>
      <PageHeader title={t("title")} />
      <SettingsPanels
        name={ctx.userName}
        email={ctx.email}
        theme={ctx.theme}
        timeZone={ctx.timeZone}
        currencyCode={ctx.currencyCode}
        currencyLocked={currencyLocked}
        canManageLedger={can.manageLedger(ctx.role)}
        isDemoAccount={demoAccount()?.email.toLowerCase() === ctx.email.toLowerCase()}
        timeZones={timeZones}
      />
    </>
  );
}
