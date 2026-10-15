import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={<FileQuestion />}
        title={t("title")}
        body={t("body")}
        action={
          <Link href="/dashboard" className={buttonVariants()}>
            {t("home")}
          </Link>
        }
      />
    </main>
  );
}
