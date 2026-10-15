import { getTranslations } from "next-intl/server";

import { MoneyText } from "@/components/money-text";
import { PageHeader } from "@/components/page-header";
import { AccountsManager } from "@/features/accounts/components/accounts-manager";
import { listAccounts, totalBalance } from "@/features/accounts/server";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("accounts");
  return { title: t("title") };
}

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const ctx = await requireContext();
  const t = await getTranslations();
  const showArchived = (await searchParams).archived === "1";
  const accounts = await listAccounts(getDb(), ctx, { includeArchived: true });
  return (
    <>
      <PageHeader title={t("accounts.title")}>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.totalBalance")}:{" "}
          <MoneyText minor={totalBalance(accounts)} className="font-semibold text-foreground" />
        </p>
      </PageHeader>
      <AccountsManager accounts={accounts} showArchived={showArchived} />
    </>
  );
}
