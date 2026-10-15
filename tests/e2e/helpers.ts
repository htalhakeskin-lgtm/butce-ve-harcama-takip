import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

const MAIL_DIR = path.join(process.cwd(), ".dev-mail");

type Mail = { to: string; subject: string; text: string; sentAt: string };

/** Reads the newest e-mail sent to `to` by the file transport (EMAIL_TRANSPORT=file). */
export async function latestMail(to: string, timeoutMs = 15_000): Promise<Mail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(MAIL_DIR).catch(() => []))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    for (const file of files) {
      const mail = JSON.parse(await readFile(path.join(MAIL_DIR, file), "utf8")) as Mail;
      if (mail.to === to) return mail;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No e-mail for ${to}`);
}

export function linkIn(mail: Mail): string {
  const match = /(https?:\/\/\S+)/.exec(mail.text);
  if (!match?.[1]) throw new Error("No link in e-mail");
  return match[1];
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const PASSWORD = "Kuzey-Ruzgari-Mavi-2026";

/** UC-01: register, open the verification link, land on the dashboard. */
export async function registerAndVerify(page: Page, name: string, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Adınız").fill(name);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL(/\/check-email/);
  const mail = await latestMail(email);
  await page.goto(linkIn(mail));
  await expect(page).toHaveURL(/\/dashboard/);
}

/** The visible "İşlem ekle" control: sidebar button on desktop, "+" in the bottom bar on phones. */
export function addTransactionButton(page: Page): Locator {
  return page.getByRole("button", { name: "İşlem ekle" }).filter({ visible: true }).first();
}

export type TxInput = {
  type?: "Gider" | "Gelir" | "Transfer";
  amount: string;
  account?: string;
  toAccount?: string;
  category?: string;
  description?: string;
};

export async function addTransaction(page: Page, input: TxInput): Promise<void> {
  await addTransactionButton(page).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if (input.type) await dialog.getByRole("radio", { name: input.type }).click();
  await dialog.getByLabel("Tutar").fill(input.amount);
  if (input.type === "Transfer") {
    if (input.account) await dialog.getByLabel("Kaynak hesap").selectOption({ label: input.account });
    if (input.toAccount) await dialog.getByLabel("Hedef hesap").selectOption({ label: input.toAccount });
  } else {
    if (input.category) await dialog.getByLabel("Kategori").selectOption({ label: input.category });
    if (input.account) await dialog.getByLabel("Hesap", { exact: true }).selectOption({ label: input.account });
  }
  if (input.description) await dialog.getByLabel(/Açıklama/).fill(input.description);
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(dialog).toBeHidden();
}
