import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { addTransaction, registerAndVerify, uniqueEmail } from "./helpers";

/**
 * S1 demo scenario (plan §13.3) — the proof that Faz 1 meets the job posting.
 * Runs on desktop (1440×900) and phone (390×844).
 */

async function addAccount(page: Page, name: string, type: string, amount: string) {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Hesap ekle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Hesap adı").fill(name);
  await dialog.getByLabel("Tür").selectOption({ label: type });
  await dialog.getByLabel(type === "Kredi kartı" ? "Mevcut borç" : "Açılış bakiyesi").fill(amount);
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
}

async function setBudget(page: Page, amount: string, category?: string) {
  await page.goto("/budgets");
  if (category) {
    await page.getByRole("button", { name: "Kategori bütçesi ekle" }).click();
    await page.getByRole("dialog").getByLabel("Kategori").selectOption({ label: category });
  } else {
    await page.getByRole("button", { name: "Genel bütçe belirle" }).click();
  }
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tutar").fill(amount);
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toBeHidden();
}

test("S1: register, record a month, see dashboard, filters, reports and budget", async ({ page }, testInfo) => {
  // 1. Register and verify
  await registerAndVerify(page, "Ayşe Yılmaz", uniqueEmail(`s1-${testInfo.project.name}`));
  await expect(page.getByText("İlk işleminizi ekleyin")).toBeVisible();

  // 2. Accounts ("Nakit" exists already)
  await addAccount(page, "Banka", "Banka", "25.000");
  await addAccount(page, "Kredi Kartı", "Kredi kartı", "0");

  // 3–4. Income and expenses
  await page.goto("/dashboard");
  await addTransaction(page, { type: "Gelir", amount: "40000", category: "Maaş", account: "Banka" });
  await addTransaction(page, { amount: "1.250,50", category: "Market", account: "Banka", description: "Market" });
  await addTransaction(page, { amount: "2000", category: "Ulaşım › Yakıt", account: "Kredi Kartı" });
  await addTransaction(page, { amount: "650", category: "Faturalar › Elektrik", account: "Banka" });

  // 5. Delete the market expense and undo; edit the electricity description
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: /Market/ })
    .first()
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Sil" }).click();
  await expect(page.getByRole("button", { name: /Market/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Geri al" }).click();
  await expect(page.getByRole("button", { name: /Market/ }).first()).toBeVisible();

  await page
    .getByRole("button", { name: /Elektrik/ })
    .first()
    .click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel(/Açıklama/).fill("Ekim elektrik faturası");
  await editDialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Ekim elektrik faturası/ })).toBeVisible();

  // 6. Transfer
  await addTransaction(page, { type: "Transfer", amount: "1000", account: "Banka", toAccount: "Nakit" });

  // 7. Budgets
  await setBudget(page, "20000");
  await setBudget(page, "3000", "Market");

  // 8. Dashboard figures (BR-ACC-003, BR-DSH-002, BR-BUD-002)
  await page.goto("/dashboard");
  const stats = page.getByRole("region", { name: "Özet" });
  await expect(stats).toContainText("61.099,50 ₺");
  await expect(stats).toContainText("40.000,00 ₺");
  await expect(stats).toContainText("3.900,50 ₺");
  await expect(stats).toContainText("16.099,50 ₺");

  // 9. Filter by "Ulaşım" (includes its children)
  await page.goto("/transactions");
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  const filters = page.getByRole("dialog");
  await filters.getByRole("checkbox", { name: "Ulaşım" }).check();
  await filters.getByRole("button", { name: "Uygula" }).click();
  await expect(page).toHaveURL(/category=/);
  await expect(page.getByText("1 işlem")).toBeVisible();
  await expect(page.locator("main")).toContainText("2.000,00 ₺");

  // 10. Reports: category shares
  await page.goto("/reports");
  const table = page.getByRole("table").filter({ hasText: "Ulaşım" });
  await expect(table).toContainText("%51,3");
  await expect(table).toContainText("%32,1");
  await expect(table).toContainText("%16,7");

  // 11. Budget screen
  await page.goto("/budgets");
  await expect(page.getByRole("listitem").filter({ hasText: "Market" })).toContainText("1.749,50 ₺");

  // NFR-01: no horizontal scrolling on any main screen
  for (const path of ["/dashboard", "/transactions", "/accounts", "/categories", "/budgets", "/reports", "/settings"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls horizontally`).toBeLessThanOrEqual(0);
  }
});

test("NFR-07: main screens have no serious or critical accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Scanned once, on desktop");
  await registerAndVerify(page, "Erişilebilirlik Testi", uniqueEmail("a11y"));
  await addTransaction(page, { amount: "125", category: "Market" });
  for (const path of ["/dashboard", "/transactions", "/accounts", "/categories", "/budgets", "/reports", "/settings"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});
