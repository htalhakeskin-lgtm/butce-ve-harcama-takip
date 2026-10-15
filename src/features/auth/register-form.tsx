"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Checkbox, Input } from "@/components/ui/input";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { useErrorText } from "@/lib/use-error-text";
import { CURRENT_LEGAL_VERSION, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";

import { FormAlert } from "./auth-card";
import { PasswordInput } from "./password-input";

type Errors = Partial<Record<"name" | "email" | "password" | "privacy" | "terms" | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const next: Errors = {};
    if (!name) next.name = errorText("required");
    else if (name.length > 60) next.name = errorText("tooLong|60");
    if (!EMAIL_RE.test(email)) next.email = errorText("invalidEmail");
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) next.password = errorText("BR-AUTH-001");
    if (!form.get("privacy")) next.privacy = errorText("mustAccept");
    if (!form.get("terms")) next.terms = errorText("mustAccept");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      document.getElementById(first === "privacy" || first === "terms" ? first : (first ?? "name"))?.focus();
      return;
    }

    setPending(true);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      consentVersion: CURRENT_LEGAL_VERSION,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: "tr",
      callbackURL: "/verified",
    });
    if (error) {
      setPending(false);
      const code = authErrorCode(error);
      if (code.startsWith("BR-AUTH-001")) setErrors({ password: errorText(code) });
      else if (code === "invalidEmail") setErrors({ email: errorText(code) });
      else setErrors({ form: errorText(code) });
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(email)}`);
  }

  const legalLink = (href: string) => (chunks: ReactNode) => (
    <Link href={href} target="_blank" className="text-accent underline-offset-4 hover:underline">
      {chunks}
    </Link>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
      <Field id="name" label={t("register.name")} error={errors.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={describedBy("name", errors.name)} autoFocus />
      </Field>
      <Field id="email" label={t("register.email")} error={errors.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={describedBy("email", errors.email)} />
      </Field>
      <Field id="password" label={t("register.password")} error={errors.password} hint={t("register.passwordHint")}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={!!errors.password}
          aria-describedby={describedBy("password", errors.password, t("register.passwordHint"))}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
        />
      </Field>
      <div className="flex flex-col gap-3">
        <div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox id="privacy" name="privacy" className="mt-0.5" aria-invalid={!!errors.privacy} />
            <span>{t.rich("register.privacy", { link: legalLink("/legal/privacy") })}</span>
          </label>
          {errors.privacy ? <p className="mt-1 ml-8 text-sm text-danger">{errors.privacy}</p> : null}
        </div>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox id="terms" name="terms" className="mt-0.5" aria-invalid={!!errors.terms} />
            <span>{t.rich("register.terms", { link: legalLink("/legal/terms") })}</span>
          </label>
          {errors.terms ? <p className="mt-1 ml-8 text-sm text-danger">{errors.terms}</p> : null}
        </div>
      </div>
      <Button type="submit" size="lg" loading={pending}>
        {t("register.submit")}
      </Button>
    </form>
  );
}
