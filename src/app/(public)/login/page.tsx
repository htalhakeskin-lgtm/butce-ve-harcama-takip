import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import { getSessionUser } from "@/server/context";

export async function generateMetadata() {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

function safeRedirect(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  if (await getSessionUser()) redirect(safeRedirect(params.next));
  const t = await getTranslations("auth.login");
  const notice = params.notice === "passwordChanged" || params.notice === "accountDeleted" ? params.notice : undefined;
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            {t("register")}
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={safeRedirect(params.next)} {...(notice ? { notice } : {})} />
    </AuthCard>
  );
}
