/** Supported UI languages. English is added in Faz 5 (FR-SET-04); the structure is ready for it. */
export const LOCALES = ["tr"] as const;
export type Locale = (typeof LOCALES)[number] | "en";
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(value: string | undefined | null): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}
