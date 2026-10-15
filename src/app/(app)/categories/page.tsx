import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { CategoriesManager } from "@/features/categories/components/categories-manager";
import { listCategories } from "@/features/categories/server";
import { requireContext } from "@/server/context";
import { getDb } from "@/server/db";

export async function generateMetadata() {
  const t = await getTranslations("categories");
  return { title: t("title") };
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; archived?: string }>;
}) {
  const ctx = await requireContext();
  const t = await getTranslations("categories");
  const params = await searchParams;
  const kind = params.kind === "income" ? "income" : "expense";
  const categories = await listCategories(getDb(), ctx, { includeArchived: true });
  return (
    <>
      <PageHeader title={t("title")} />
      <CategoriesManager categories={categories} kind={kind} showArchived={params.archived === "1"} />
    </>
  );
}
