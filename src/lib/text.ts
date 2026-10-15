/**
 * Normalized key for case-insensitive uniqueness (BR-ACC-005, BR-CAT-003).
 * PostgreSQL's lower() does not apply Turkish casing (İ→i, I→ı), so the key is computed here.
 */
export function nameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

/** Collapses whitespace and trims user-entered names. */
export function cleanName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Locale-aware comparison for sorting names. */
export function compareNames(a: string, b: string, locale: string): number {
  return a.localeCompare(b, locale === "tr" ? "tr-TR" : "en-GB", { sensitivity: "base" });
}
