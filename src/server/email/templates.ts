import "server-only";

import { createTranslator } from "next-intl";

import { publicEnv } from "@/env";
import { resolveLocale } from "@/i18n/config";
import tr from "@/i18n/messages/tr.json";

/**
 * Transactional e-mail templates. Plain HTML with inline styles: e-mail clients ignore
 * stylesheets and most of them do not support modern CSS.
 */

type Rendered = { subject: string; html: string; text: string };

const MESSAGES = { tr } as const;

function translator(locale: string | undefined) {
  const resolved = resolveLocale(locale);
  return createTranslator({ locale: resolved, messages: MESSAGES[resolved as "tr"] ?? tr, namespace: "emails" });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(input: {
  greeting: string;
  body: string;
  action?: { label: string; url: string };
  footer: string;
  ignore: string;
  linkFallback: string;
}): { html: string; text: string } {
  const appName = escapeHtml(publicEnv.appName);
  const button = input.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.action.url)}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(input.action.label)}</a></p>
       <p style="font-size:13px;color:#57534e;margin:0 0 4px">${escapeHtml(input.linkFallback)}</p>
       <p style="font-size:13px;word-break:break-all;margin:0"><a href="${escapeHtml(input.action.url)}" style="color:#0f766e">${escapeHtml(input.action.url)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <p style="font-weight:700;font-size:18px;margin:0 0 24px">${appName}</p>
    <div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e7e5e4">
      <p style="margin:0 0 16px;font-size:16px">${escapeHtml(input.greeting)}</p>
      <p style="margin:0;font-size:16px;line-height:1.6">${escapeHtml(input.body)}</p>
      ${button}
    </div>
    <p style="font-size:12px;color:#78716c;line-height:1.5;margin:20px 4px 0">${escapeHtml(input.ignore)}<br>${escapeHtml(input.footer)}</p>
  </div></body></html>`;
  const text = [
    input.greeting,
    "",
    input.body,
    ...(input.action ? ["", `${input.action.label}: ${input.action.url}`] : []),
    "",
    input.ignore,
    input.footer,
  ].join("\n");
  return { html, text };
}

type Base = { locale?: string; name: string };

function render(
  key: "verify" | "reset" | "existing" | "changeEmail" | "deleted",
  input: Base & { url?: string; values?: Record<string, string> },
): Rendered {
  const t = translator(input.locale);
  const values = { appName: publicEnv.appName, name: input.name, ...input.values };
  const parts = layout({
    greeting: t(`${key}.greeting`, values),
    body: t(`${key}.body`, values),
    ...(input.url && key !== "deleted" ? { action: { label: t(`${key}.action`), url: input.url } } : {}),
    footer: t("footer", values),
    ignore: t("ignore"),
    linkFallback: t("linkFallback"),
  });
  return { subject: t(`${key}.subject`, values), ...parts };
}

export const emailTemplates = {
  verify: (input: Base & { url: string }) => render("verify", input),
  reset: (input: Base & { url: string }) => render("reset", input),
  existing: (input: Base & { url: string }) => render("existing", input),
  changeEmail: (input: Base & { url: string; newEmail: string }) =>
    render("changeEmail", { ...input, values: { newEmail: input.newEmail } }),
  deleted: (input: Base) => render("deleted", input),
};
