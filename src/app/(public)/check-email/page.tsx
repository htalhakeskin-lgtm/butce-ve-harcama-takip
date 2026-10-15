import { MailCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/auth-card";
import { ResendVerification } from "@/features/auth/simple-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth.checkEmail");
  return { title: t("title") };
}

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("checkEmail.title")}
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      }
    >
      <MailCheck aria-hidden className="mb-4 size-10 text-accent" />
      <p>{t("checkEmail.body", { email })}</p>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{t("checkEmail.spamHint")}</p>
      <ResendVerification email={email} />
    </AuthCard>
  );
}
