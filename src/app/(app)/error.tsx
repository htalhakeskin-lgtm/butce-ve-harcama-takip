"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** Error state for app screens (ui standard §10.3): what happened, try again, error id. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  const tc = useTranslations("common");
  return (
    <EmptyState
      icon={<TriangleAlert />}
      title={t("title")}
      body={
        <>
          {t("body")}
          {error.digest ? <span className="mt-2 block text-xs">{tc("errorId", { id: error.digest })}</span> : null}
        </>
      }
      action={<Button onClick={reset}>{tc("retry")}</Button>}
    />
  );
}
