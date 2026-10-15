import { isIsoDay, presetRange, RANGE_PRESETS, type RangePreset } from "@/lib/dates";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/domain-constants";
import { isUuid } from "@/lib/ids";
import { parseMoney } from "@/lib/money";

import type { TransactionFilters } from "./schemas";

/**
 * URL ⇄ filters (FR-TRX-11). Parameters: range, from, to, category*, account*, type*, min, max.
 * Shared by the server page (parse) and the client filter bar (build).
 */

export type RangeChoice = RangePreset | "custom" | "all";
export const RANGE_CHOICES: RangeChoice[] = [...RANGE_PRESETS, "custom", "all"];

export type UrlFilters = {
  range: RangeChoice;
  from: string;
  to: string;
  categoryIds: string[];
  accountIds: string[];
  types: TransactionType[];
  min: string;
  max: string;
};

type Params = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseUrlFilters(params: Params): UrlFilters {
  const rangeParam = typeof params.range === "string" ? params.range : undefined;
  const hasAccountOnly = list(params.account).length > 0 && !rangeParam;
  const range: RangeChoice = RANGE_CHOICES.includes(rangeParam as RangeChoice)
    ? (rangeParam as RangeChoice)
    : hasAccountOnly
      ? "all"
      : "thisMonth";
  return {
    range,
    from: typeof params.from === "string" && isIsoDay(params.from) ? params.from : "",
    to: typeof params.to === "string" && isIsoDay(params.to) ? params.to : "",
    categoryIds: list(params.category).filter(isUuid),
    accountIds: list(params.account).filter(isUuid),
    types: list(params.type).filter((t): t is TransactionType => (TRANSACTION_TYPES as readonly string[]).includes(t)),
    min: typeof params.min === "string" ? params.min : "",
    max: typeof params.max === "string" ? params.max : "",
  };
}

export function toServiceFilters(url: UrlFilters, today: string): TransactionFilters {
  let from: string | undefined;
  let to: string | undefined;
  if (url.range === "custom") {
    from = url.from || undefined;
    to = url.to || undefined;
  } else if (url.range !== "all") {
    ({ from, to } = presetRange(url.range, today));
  }
  const min = url.min ? parseMoney(url.min) : null;
  const max = url.max ? parseMoney(url.max) : null;
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    categoryIds: url.categoryIds,
    accountIds: url.accountIds,
    types: url.types,
    ...(min !== null && min >= 0 ? { amountMin: min } : {}),
    ...(max !== null && max >= 0 ? { amountMax: max } : {}),
  };
}

export function buildSearch(url: UrlFilters): string {
  const params = new URLSearchParams();
  if (url.range !== "thisMonth") params.set("range", url.range);
  if (url.range === "custom") {
    if (url.from) params.set("from", url.from);
    if (url.to) params.set("to", url.to);
  }
  url.categoryIds.forEach((id) => params.append("category", id));
  url.accountIds.forEach((id) => params.append("account", id));
  url.types.forEach((type) => params.append("type", type));
  if (url.min) params.set("min", url.min);
  if (url.max) params.set("max", url.max);
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function activeFilterCount(url: UrlFilters): number {
  return url.categoryIds.length + url.accountIds.length + url.types.length + (url.min ? 1 : 0) + (url.max ? 1 : 0);
}
