import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { LedgerProvider } from "@/components/ledger-context";
import { demoAccount, publicEnv } from "@/env";
import { listAccounts } from "@/features/accounts/server";
import { listCategories } from "@/features/categories/server";
import { TransactionDialogProvider } from "@/features/transactions/components/transaction-dialog";
import { lastUsedAccountId, recentCategoryIds } from "@/features/transactions/server";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireContext();
  const db = getDb();
  const [accounts, categories, recentExpense, recentIncome, defaultAccountId] = await Promise.all([
    listAccounts(db, ctx, { includeArchived: true }),
    listCategories(db, ctx, { includeArchived: true }),
    recentCategoryIds(db, ctx, "expense"),
    recentCategoryIds(db, ctx, "income"),
    lastUsedAccountId(db, ctx),
  ]);

  return (
    <LedgerProvider
      value={{
        currencyCode: ctx.currencyCode,
        today: ctx.today,
        timeZone: ctx.timeZone,
        role: ctx.role,
        userName: ctx.userName,
        email: ctx.email,
      }}
    >
      <TransactionDialogProvider
        data={{ accounts, categories, recent: { expense: recentExpense, income: recentIncome }, defaultAccountId }}
      >
        <AppShell
          demo={demoAccount() !== null}
          appName={publicEnv.appName}
          userName={ctx.userName}
          email={ctx.email}
          theme={ctx.theme}
        >
          {children}
        </AppShell>
      </TransactionDialogProvider>
    </LedgerProvider>
  );
}
