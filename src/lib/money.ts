/**
 * Money helpers (ADR-0005). Amounts live as integers in minor units (kuruş) everywhere:
 * database, server, client. Only this module converts between text and minor units.
 */

export const SUPPORTED_CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** BR-SYS-007 */
export const MIN_AMOUNT_MINOR = 1;
export const MAX_AMOUNT_MINOR = 100_000_000_000;

const MINOR_DIGITS = 2;
const MINOR_FACTOR = 10 ** MINOR_DIGITS;

/**
 * Parses user input into minor units. Accepts Turkish and English styles:
 * "1.234,56", "1234,56", "1234.56", "1,234.56", "1.234" (thousands), "12,5", "₺ 1.234,56".
 * Returns null when the text is not a valid amount with at most two decimals.
 */
export function parseMoney(input: string): number | null {
  let text = input.replace(/[\s ₺$€£]|TL|TRY/gi, "");
  let negative = false;
  if (text.startsWith("-") || text.startsWith("−")) {
    negative = true;
    text = text.slice(1);
  }
  if (text === "" || !/^[\d.,]+$/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  let integerPart: string;
  let fractionPart = "";

  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the one that comes last is the decimal separator.
    const decimalSep = lastDot > lastComma ? "." : ",";
    const groupSep = decimalSep === "." ? "," : ".";
    const [whole, fraction, ...rest] = text.split(decimalSep);
    if (rest.length > 0 || whole === undefined || fraction === undefined) return null;
    if (!isValidGrouping(whole, groupSep)) return null;
    integerPart = whole.split(groupSep).join("");
    fractionPart = fraction;
  } else if (lastComma >= 0) {
    const parts = text.split(",");
    if (parts.length === 2) {
      integerPart = parts[0] ?? "";
      fractionPart = parts[1] ?? "";
    } else if (isValidGrouping(text, ",")) {
      integerPart = parts.join("");
    } else {
      return null;
    }
  } else if (lastDot >= 0) {
    // "1.234" and "1.234.567" are thousands groups; "12.5" and "12.50" are decimals.
    if (
      isValidGrouping(text, ".") &&
      text.split(".").length > 1 &&
      text.split(".").every((g, i) => i === 0 || g.length === 3)
    ) {
      integerPart = text.split(".").join("");
    } else {
      const parts = text.split(".");
      if (parts.length !== 2) return null;
      integerPart = parts[0] ?? "";
      fractionPart = parts[1] ?? "";
    }
  } else {
    integerPart = text;
  }

  if (integerPart === "") integerPart = "0";
  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) return null;
  if (fractionPart.length > MINOR_DIGITS) return null;

  const minor = Number(integerPart) * MINOR_FACTOR + Number(fractionPart.padEnd(MINOR_DIGITS, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

function isValidGrouping(text: string, groupSep: string): boolean {
  const groups = text.split(groupSep);
  if (groups.length === 1) return true;
  const [first, ...others] = groups;
  if (first === undefined || first.length === 0 || first.length > 3) return false;
  return others.every((g) => g.length === 3);
}

export function isValidAmount(minor: number): boolean {
  return Number.isSafeInteger(minor) && minor >= MIN_AMOUNT_MINOR && minor <= MAX_AMOUNT_MINOR;
}

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: MINOR_DIGITS,
      maximumFractionDigits: MINOR_DIGITS,
    });
    formatters.set(key, f);
  }
  return f;
}

export type FormatMoneyOptions = {
  /** Show "+" for positive values (income). */
  signed?: boolean;
  /** Hide the currency symbol (tables with a currency in the header). */
  hideSymbol?: boolean;
};

/**
 * Formats minor units for display. Turkish puts the symbol after the number ("1.234,56 ₺"),
 * following bank and invoice practice, although Intl's tr default puts it first (ui standard).
 */
export function formatMoney(minor: number, currency: string, locale: string, options: FormatMoneyOptions = {}): string {
  const parts = numberFormat(locale, currency).formatToParts(Math.abs(minor) / MINOR_FACTOR);
  const number = parts
    .filter((p) => p.type !== "currency" && p.type !== "literal" && p.type !== "minusSign")
    .map((p) => p.value)
    .join("");
  const symbol = parts.find((p) => p.type === "currency")?.value ?? currency;
  const sign = minor < 0 ? "−" : options.signed && minor > 0 ? "+" : "";
  if (options.hideSymbol) return `${sign}${number}`;
  return locale === "tr" ? `${sign}${number} ${symbol}` : `${sign}${symbol}${number}`;
}

/** Text for an input field: "1234,56" (tr) or "1234.56" (en), no grouping, no symbol. */
export function toInputString(minor: number, locale: string): string {
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / MINOR_FACTOR);
  const fraction = String(abs % MINOR_FACTOR).padStart(MINOR_DIGITS, "0");
  const sep = locale === "tr" ? "," : ".";
  return `${minor < 0 ? "-" : ""}${whole}${sep}${fraction}`;
}

/**
 * Splits a total into n parts that sum exactly to the total. Leftover minor units go to the
 * first part: 100000 / 3 → [33334, 33333, 33333] (BR-INS-002).
 */
export function splitEvenly(totalMinor: number, n: number): number[] {
  if (!Number.isSafeInteger(totalMinor) || !Number.isInteger(n) || n < 1) {
    throw new RangeError("splitEvenly needs a safe integer total and n >= 1");
  }
  const base = Math.floor(totalMinor / n);
  const leftover = totalMinor - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + leftover : base));
}

/** Percentage with one decimal, rounded half away from zero; null when the base is zero. */
export function percentOf(part: number, whole: number): number | null {
  if (whole === 0) return null;
  const value = (part / whole) * 1000;
  return (Math.sign(value) * Math.round(Math.abs(value))) / 10;
}
