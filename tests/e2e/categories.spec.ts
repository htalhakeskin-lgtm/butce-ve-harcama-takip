import { expect, test, type Page } from "@playwright/test";

import { addTransaction, registerAndVerify, uniqueEmail } from "./helpers";

/** UC-10 (İ-04): category management through the UI. */

async function openActions(page: Page, name: string) {
  await page.getByRole("button", { name: `${name}: İşlemler` }).click();
}

async function saveCategoryDialog(page: Page, fields: { name?: string; parent?: string }) {
  const dialog = page.getByRole("dialog");
  if (fields.name !== undefined) await dialog.getByLabel("Kategori adı").fill(fields.name);
  if (fields.parent) await dialog.getByLabel("Üst kategori").selectOption({ label: fields.parent });
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toBeHidden();
}

test("UC-10: add, nest, rename, merge and archive categories", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Runs once, on desktop");
  await registerAndVerify(page, "Kategori Testi", uniqueEmail("categories"));

  await page.goto("/categories");
  // Add a top-level category and a subcategory under it.
  await page.getByRole("button", { name: "Kategori ekle" }).click();
  await saveCategoryDialog(page, { name: "Evcil hayvan" });
  await expect(page.getByRole("link", { name: "Evcil hayvan", exact: true })).toBeVisible();

  await openActions(page, "Evcil hayvan");
  await page.getByRole("menuitem", { name: "Alt kategori ekle" }).click();
  await saveCategoryDialog(page, { name: "Mama" });
  await expect(page.getByRole("link", { name: "Mama", exact: true })).toBeVisible();

  // BR-CAT-003: duplicate names are rejected with a message on the field.
  await page.getByRole("button", { name: "Kategori ekle" }).click();
  await page.getByRole("dialog").getByLabel("Kategori adı").fill("MARKET");
  await page.getByRole("dialog").getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("dialog").getByText("Bu adda bir kategori zaten var.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Vazgeç" }).click();

  // Rename
  await openActions(page, "Mama");
  await page.getByRole("menuitem", { name: "Düzenle" }).click();
  await saveCategoryDialog(page, { name: "Mama ve kum" });
  await expect(page.getByRole("link", { name: "Mama ve kum", exact: true })).toBeVisible();

  // A used category is merged instead of deleted (BR-CAT-004).
  await addTransaction(page, { amount: "300", category: "Evcil hayvan › Mama ve kum" });
  await page.goto("/categories");
  await openActions(page, "Mama ve kum");
  await page.getByRole("menuitem", { name: "Birleştir" }).click();
  const merge = page.getByRole("dialog");
  await merge.getByLabel("Hedef kategori").selectOption({ label: "Ev" });
  await merge.getByRole("button", { name: "Birleştir ve sil" }).click();
  await expect(merge).toBeHidden();
  await expect(page.getByRole("link", { name: "Mama ve kum", exact: true })).toHaveCount(0);

  await page.goto("/transactions");
  await expect(page.getByRole("button", { name: /Ev/ }).first()).toBeVisible();

  // Archive hides the category from new transactions but keeps it under "show archived".
  await page.goto("/categories");
  await openActions(page, "Evcil hayvan");
  await page.getByRole("menuitem", { name: "Arşivle" }).click();
  await expect(page.getByRole("link", { name: "Evcil hayvan", exact: true })).toHaveCount(0);
  await page.getByLabel("Arşivlenmişleri göster").check();
  await expect(page).toHaveURL(/archived=1/);
  await expect(page.getByRole("link", { name: "Evcil hayvan", exact: true })).toBeVisible();

  // Income tab lists income categories.
  await page.getByRole("tab", { name: "Gelir" }).click();
  await expect(page.getByRole("link", { name: "Maaş", exact: true })).toBeVisible();
});
