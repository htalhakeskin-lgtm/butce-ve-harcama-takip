import { getTranslations } from "next-intl/server";

import { MonthPicker, parseMonthParam } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { BudgetsManager } from "@/features/budgets/components/budgets-manager";
import { budgetOverview } from "@/features/budgets/server";
import { listCategories } from "@/features/categories/server";
import { monthOf } from "@/lib/dates";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("budgets");
  return { title: t("title") };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  const t = await getTranslations("budgets");
  const month = parseMonthParam((await searchParams).month, monthOf(ctx.today));
  const db = getDb();
  const [overview, categories] = await Promise.all([
    budgetOverview(db, ctx, month),
    listCategories(db, ctx, { kind: "expense" }),
  ]);
  return (
    <>
      <PageHeader title={t("title")} actions={<MonthPicker month={month} basePath="/budgets" />} />
      <BudgetsManager overview={overview} categories={categories} />
    </>
  );
}
