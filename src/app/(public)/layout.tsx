import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { publicEnv } from "@/env";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("legal");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {publicEnv.appName}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">{children}</main>
      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
        <Link href="/legal/privacy" className="hover:text-foreground">
          {t("privacyTitle")}
        </Link>
        <Link href="/legal/terms" className="hover:text-foreground">
          {t("termsTitle")}
        </Link>
        <Link href="/legal/cookies" className="hover:text-foreground">
          {t("cookiesTitle")}
        </Link>
      </footer>
    </div>
  );
}
