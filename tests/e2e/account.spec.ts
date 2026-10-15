import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { addTransaction, latestMail, linkIn, PASSWORD, registerAndVerify, uniqueEmail } from "./helpers";

test.describe("account lifecycle", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Account flows run once, on desktop");
  });

  test("UC-02/UC-03: sign out, reset the password, sign in with the new one", async ({ page }) => {
    const email = uniqueEmail("reset");
    await registerAndVerify(page, "Şifre Testi", email);

    await page.getByRole("button", { name: "Kullanıcı menüsü" }).click();
    await page.getByRole("menuitem", { name: "Çıkış yap" }).click();
    await expect(page).toHaveURL(/\/login/);

    // BR-AUTH-003: the same answer whether or not the address exists
    await page.getByRole("link", { name: "Şifremi unuttum" }).click();
    await expect(page.getByRole("heading", { name: "Şifremi unuttum" })).toBeVisible();
    await page.getByLabel("E-posta").fill(email);
    await page.getByRole("button", { name: "Bağlantı gönder" }).click();
    await expect(page.getByText("Bu adres kayıtlıysa")).toBeVisible();

    const mail = await latestMail(email);
    expect(mail.subject).toContain("şifre sıfırlama");
    await page.goto(linkIn(mail));
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const newPassword = "Yepyeni-Bir-Sifre-2026";
    await page.getByLabel("Yeni şifre", { exact: true }).fill(newPassword);
    await page.getByLabel("Yeni şifre (tekrar)").fill(newPassword);
    await page.getByRole("button", { name: "Şifreyi değiştir" }).click();
    await expect(page.getByText("Şifreniz değişti")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // The old password no longer works; the new one does.
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText("E-posta veya şifre hatalı.")).toBeVisible();
    await page.getByLabel("Şifre", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("UC-35/UC-36: download my data, then delete the account", async ({ page }) => {
    const email = uniqueEmail("privacy");
    await registerAndVerify(page, "Gizlilik Testi", email);
    await addTransaction(page, { amount: "99,90", category: "Market", description: "Dışa aktarma kontrolü" });

    await page.goto("/settings");
    await page.getByLabel("Mevcut şifre").nth(1).fill(PASSWORD);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Verilerimi indir" }).click(),
    ]);
    const file = await download.path();
    const data = JSON.parse(await readFile(file, "utf8")) as {
      user: { email: string };
      ledgers: { transactions: { amountMinor: number; description: string }[] }[];
    };
    expect(data.user.email).toBe(email);
    expect(data.ledgers[0]?.transactions).toEqual([
      expect.objectContaining({ amountMinor: 9990, description: "Dışa aktarma kontrolü" }),
    ]);

    await page.getByLabel("Mevcut şifre").nth(2).fill(PASSWORD);
    await page.getByLabel("Tüm verilerimin kalıcı olarak silineceğini anlıyorum.").check();
    await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
    await expect(page).toHaveURL(/\/login\?notice=accountDeleted/);
    await expect(page.getByText("Hesabınız silindi.")).toBeVisible();

    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText("E-posta veya şifre hatalı.")).toBeVisible();
  });
});
