import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/auth-card";

/** Better Auth sends the user here after the verification link; errors arrive as ?error=… (UC-01 5a). */
export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) redirect("/dashboard");
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("verify.invalidTitle")}>
      <p className="mb-6">{t("verify.invalidBody")}</p>
      <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
        {t("login.submit")}
      </Link>
    </AuthCard>
  );
}
