import { describe, expect, it } from "vitest";

import { buildSearch, parseUrlFilters, toServiceFilters } from "./url-filters";

const CAT = "01a13f2d-4557-7139-8627-d09f0ee62d54";

describe("URL filters (FR-TRX-11)", () => {
  it("defaults to this month", () => {
    const url = parseUrlFilters({});
    expect(url.range).toBe("thisMonth");
    expect(toServiceFilters(url, "2026-10-15")).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("shows all dates when only an account is given (account detail link)", () => {
    const url = parseUrlFilters({ account: CAT });
    expect(url.range).toBe("all");
    expect(toServiceFilters(url, "2026-10-15").from).toBeUndefined();
  });

  it("round-trips through the query string and drops invalid values", () => {
    const url = parseUrlFilters({
      range: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
      category: [CAT, "not-a-uuid"],
      type: ["expense", "nope"],
      min: "1.000",
    });
    expect(url.categoryIds).toEqual([CAT]);
    expect(url.types).toEqual(["expense"]);
    const search = buildSearch(url);
    expect(parseUrlFilters(Object.fromEntries(new URLSearchParams(search)))).toMatchObject({
      range: "custom",
      from: "2026-09-01",
    });
    expect(toServiceFilters(url, "2026-10-15")).toMatchObject({
      amountMin: 100000,
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });
});
