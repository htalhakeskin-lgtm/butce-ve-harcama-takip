import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { demoAccount } from "@/env";
import { AuthCard, FormAlert } from "@/features/auth/auth-card";
import { RegisterForm } from "@/features/auth/register-form";
import { getSessionUser } from "@/server/context";

export async function generateMetadata() {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  const t = await getTranslations("auth.register");
  if (demoAccount()) {
    const td = await getTranslations("auth.demo");
    return (
      <AuthCard title={t("title")}>
        <FormAlert tone="info">{td("registerClosed")}</FormAlert>
        <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {td("goToLogin")}
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            {t("login")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
