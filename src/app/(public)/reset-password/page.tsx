import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard, FormAlert } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/simple-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("reset.title")}
      footer={
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">
          {t("forgot.title")}
        </Link>
      }
    >
      {!token || error ? <FormAlert>{t("reset.invalidLink")}</FormAlert> : <ResetPasswordForm token={token} />}
    </AuthCard>
  );
}
