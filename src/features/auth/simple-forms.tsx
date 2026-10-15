"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { useErrorText } from "@/lib/use-error-text";

import { FormAlert } from "./auth-card";
import { PasswordInput } from "./password-input";

/** UC-01 5a: resend the verification link (rate limited to once a minute, BR-AUTH-002). */
export function ResendVerification({ email }: { email: string }) {
  const t = useTranslations("auth.checkEmail");
  const errorText = useErrorText();
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("pending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/verified" });
    if (error) {
      setState("error");
      setMessage(errorText(authErrorCode(error)));
    } else {
      setState("sent");
      setMessage(t("resent"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? <FormAlert tone={state === "error" ? "danger" : "success"}>{message}</FormAlert> : null}
      <Button variant="secondary" onClick={resend} loading={state === "pending"} disabled={!email}>
        {t("resend")}
      </Button>
    </div>
  );
}

/** UC-03 steps 1–2. The answer is the same whether or not the address exists (BR-AUTH-003). */
export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const errorText = useErrorText();
  const [state, setState] = useState<"idle" | "pending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError(errorText("invalidEmail"));
      return;
    }
    setState("pending");
    setError(null);
    const { error: authError } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    if (authError && authError.status === 429) {
      setState("idle");
      setError(errorText("rateLimited"));
      return;
    }
    setState("sent");
  }

  if (state === "sent") return <FormAlert tone="success">{t("sent")}</FormAlert>;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Field id="email" label={t("email")}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={state === "pending"}>
        {t("submit")}
      </Button>
    </form>
  );
}

/** UC-03 steps 3–4. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      setErrors({ password: errorText("BR-AUTH-001") });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: t("reset.mismatch") });
      return;
    }
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setPending(false);
      const code = authErrorCode(error);
      if (code.startsWith("BR-AUTH-001")) setErrors({ password: errorText(code) });
      else if (error.status === 400) setErrors({ form: t("reset.invalidLink") });
      else setErrors({ form: errorText(code) });
      return;
    }
    router.replace("/login?notice=passwordChanged");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
      <Field id="password" label={t("reset.password")} error={errors.password} hint={t("register.passwordHint")}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={describedBy("password", errors.password, t("register.passwordHint"))}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          autoFocus
        />
      </Field>
      <Field id="confirm" label={t("reset.confirm")} error={errors.confirm}>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          aria-describedby={describedBy("confirm", errors.confirm)}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
        />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}
