"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useErrorText } from "@/lib/use-error-text";

import { FormAlert } from "./auth-card";
import { PasswordInput } from "./password-input";

export function LoginForm({
  notice,
  redirectTo,
  demo,
}: {
  notice?: "passwordChanged" | "accountDeleted";
  redirectTo: string;
  /** Shared demo account: the form is pre-filled (demo server only). */
  demo?: { email: string; password: string } | undefined;
}) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice ? t(`login.${notice}`) : null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setInfo(null);
    const { error: authError } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      callbackURL: "/dashboard",
    });
    if (!authError) {
      router.replace(redirectTo);
      router.refresh();
      return;
    }
    setPending(false);
    if (authError.status === 403) setInfo(t("login.unverified"));
    else if (authError.status === 429) setError(errorText("rateLimited"));
    else if (authError.status === 401 || authError.status === 400) setError(t("login.invalid"));
    else setError(errorText("unexpected"));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      {info ? <FormAlert tone="info">{info}</FormAlert> : null}
      {demo ? <FormAlert tone="info">{t("demo.notice")}</FormAlert> : null}
      <Field id="email" label={t("login.email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          defaultValue={demo?.email}
        />
      </Field>
      <Field id="password" label={t("login.password")}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          defaultValue={demo?.password}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
        />
      </Field>
      {demo ? null : (
        <div className="-mt-1 text-right text-sm">
          <Link href="/forgot-password" className="text-accent hover:underline">
            {t("login.forgot")}
          </Link>
        </div>
      )}
      <Button type="submit" size="lg" loading={pending}>
        {t("login.submit")}
      </Button>
    </form>
  );
}
