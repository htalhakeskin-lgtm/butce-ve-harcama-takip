"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { describedBy, Field } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/password-input";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { THEMES, type Theme } from "@/lib/domain-constants";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { useErrorText } from "@/lib/use-error-text";

import { updateCurrencyAction, updatePreferencesAction } from "../actions";

type Props = {
  name: string;
  email: string;
  theme: Theme;
  timeZone: string;
  currencyCode: string;
  currencyLocked: boolean;
  canManageLedger: boolean;
  timeZones: string[];
};

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader>
        <CardTitle id={id}>{title}</CardTitle>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function SettingsPanels(props: Props) {
  const t = useTranslations("settings");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section id="profile" title={t("profile")}>
        <ProfileForm name={props.name} email={props.email} />
      </Section>
      <Section id="security" title={t("security")}>
        <PasswordForm />
      </Section>
      <Section id="preferences" title={t("preferences")}>
        <PreferencesForm {...props} />
      </Section>
      <Section id="data" title={t("data")}>
        <DataPanel />
      </Section>
    </div>
  );
}

function ProfileForm({ name, email }: { name: string; email: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [newEmail, setNewEmail] = useState("");
  const [pending, setPending] = useState<"name" | "email" | null>(null);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return toast.error(errorText("required"));
    setPending("name");
    const { error } = await authClient.updateUser({ name: value.trim() });
    setPending(null);
    if (error) return toast.error(errorText(authErrorCode(error)));
    toast.success(t("saved"));
    router.refresh();
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error(errorText("invalidEmail"));
    setPending("email");
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: "/settings" });
    setPending(null);
    if (error) return toast.error(errorText(authErrorCode(error)));
    setNewEmail("");
    toast.success(t("changeEmailSent"));
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={saveName} className="flex flex-col gap-3">
        <Field id="profile-name" label={t("name")}>
          <Input
            id="profile-name"
            value={value}
            maxLength={60}
            autoComplete="name"
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="secondary" className="self-start" loading={pending === "name"}>
          {tc("save")}
        </Button>
      </form>
      <form onSubmit={changeEmail} className="flex flex-col gap-3">
        <p className="text-sm">
          <span className="text-muted-foreground">{t("email")}:</span> {email}
        </p>
        <Field id="profile-new-email" label={t("newEmail")}>
          <Input
            id="profile-new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="secondary" className="self-start" loading={pending === "email"}>
          {t("changeEmail")}
        </Button>
      </form>
    </div>
  );
}

function PasswordForm() {
  const t = useTranslations("settings");
  const ta = useTranslations("auth");
  const errorText = useErrorText();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("next") ?? "");
    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      setErrors({ next: errorText("BR-AUTH-001") });
      return;
    }
    setPending(true);
    setErrors({});
    // BR-AUTH-007: every other session is signed out.
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (error) {
      const code = authErrorCode(error);
      if (code.startsWith("BR-AUTH-001")) setErrors({ next: errorText(code) });
      else if (error.status === 400 || error.status === 401) setErrors({ current: t("wrongPassword") });
      else toast.error(errorText(code));
      return;
    }
    formElement.reset();
    toast.success(t("passwordChanged"));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field id="current-password" label={t("currentPassword")} error={errors.current}>
        <PasswordInput
          id="current-password"
          name="current"
          autoComplete="current-password"
          aria-invalid={!!errors.current}
          aria-describedby={describedBy("current-password", errors.current)}
          showLabel={ta("showPassword")}
          hideLabel={ta("hidePassword")}
        />
      </Field>
      <Field id="new-password" label={t("newPassword")} error={errors.next} hint={ta("register.passwordHint")}>
        <PasswordInput
          id="new-password"
          name="next"
          autoComplete="new-password"
          aria-invalid={!!errors.next}
          aria-describedby={describedBy("new-password", errors.next, "hint")}
          showLabel={ta("showPassword")}
          hideLabel={ta("hidePassword")}
        />
      </Field>
      <Button type="submit" variant="secondary" className="self-start" loading={pending}>
        {t("changePassword")}
      </Button>
    </form>
  );
}

function PreferencesForm({ theme, timeZone, currencyCode, currencyLocked, canManageLedger, timeZones }: Props) {
  const t = useTranslations("settings");
  const errorText = useErrorText();
  const { setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState(theme);

  async function save(input: Parameters<typeof updatePreferencesAction>[0]) {
    const result = await updatePreferencesAction(input);
    if (!result.ok) toast.error(errorText(result.error.code));
    else toast.success(t("saved"));
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("theme")}</legend>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
          {THEMES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={currentTheme === value}
              onClick={() => {
                setCurrentTheme(value);
                setTheme(value);
                void save({ theme: value });
              }}
              className={
                currentTheme === value
                  ? "h-10 rounded-md bg-surface text-sm font-medium shadow-sm"
                  : "h-10 rounded-md text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {t(`themes.${value}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <Field id="time-zone" label={t("timeZone")}>
        <Select id="time-zone" defaultValue={timeZone} onChange={(e) => void save({ timeZone: e.target.value })}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="currency" label={t("currency")} hint={currencyLocked ? t("currencyLocked") : undefined}>
        <Select
          id="currency"
          defaultValue={currencyCode}
          disabled={currencyLocked || !canManageLedger}
          aria-describedby={currencyLocked ? "currency-hint" : undefined}
          onChange={async (e) => {
            const result = await updateCurrencyAction({
              currencyCode: e.target.value as (typeof SUPPORTED_CURRENCIES)[number],
            });
            if (!result.ok) toast.error(errorText(result.error.code));
            else toast.success(t("saved"));
          }}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function DataPanel() {
  const t = useTranslations("settings");
  const ta = useTranslations("auth");
  const errorText = useErrorText();
  const router = useRouter();
  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<"export" | "delete" | null>(null);

  async function exportData(event: FormEvent) {
    event.preventDefault();
    if (!exportPassword) return toast.error(t("passwordRequired"));
    setPending("export");
    const response = await fetch("/api/exports/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: exportPassword }),
    });
    setPending(null);
    if (!response.ok) return toast.error(response.status === 403 ? t("wrongPassword") : errorText("unexpected"));
    const blob = await response.blob();
    const filename =
      /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "verilerim.json";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setExportPassword("");
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (!deletePassword) return toast.error(t("passwordRequired"));
    setPending("delete");
    const { error } = await authClient.deleteUser({ password: deletePassword });
    setPending(null);
    if (error) {
      const code = authErrorCode(error);
      return toast.error(
        code === "unexpected" && (error.status === 400 || error.status === 401) ? t("wrongPassword") : errorText(code),
      );
    }
    router.replace("/login?notice=accountDeleted");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={exportData} className="flex flex-col gap-3">
        <h3 className="font-semibold">{t("exportTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("exportBody")}</p>
        <Field id="export-password" label={t("currentPassword")}>
          <PasswordInput
            id="export-password"
            autoComplete="current-password"
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
            showLabel={ta("showPassword")}
            hideLabel={ta("hidePassword")}
          />
        </Field>
        <Button type="submit" variant="secondary" className="self-start" loading={pending === "export"}>
          <Download /> {t("exportAction")}
        </Button>
      </form>

      <form onSubmit={deleteAccount} className="flex flex-col gap-3 rounded-lg border border-danger/40 p-4">
        <h3 className="font-semibold text-danger">{t("deleteTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        <Field id="delete-password" label={t("currentPassword")}>
          <PasswordInput
            id="delete-password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            showLabel={ta("showPassword")}
            hideLabel={ta("hidePassword")}
          />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          {t("deleteConfirmLabel")}
        </label>
        <Button
          type="submit"
          variant="danger"
          className="self-start"
          disabled={!confirmed}
          loading={pending === "delete"}
        >
          <Trash2 /> {t("deleteAction")}
        </Button>
      </form>
    </div>
  );
}
