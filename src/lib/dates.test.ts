import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  addMonthsToMonth,
  formatDay,
  isIsoDay,
  lastDayOfMonth,
  monthsBetween,
  presetRange,
  todayIn,
} from "./dates";

describe("todayIn (BR-SYS-006)", () => {
  it("uses the user's time zone, not UTC", () => {
    // 2026-10-14 22:30 UTC is already 15 October in Istanbul (UTC+3).
    const instant = new Date("2026-10-14T22:30:00Z");
    expect(todayIn("Europe/Istanbul", instant)).toBe("2026-10-15");
    expect(todayIn("UTC", instant)).toBe("2026-10-14");
  });
});

describe("addMonths (BR-REC-002 month-end rule)", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-28"],
    ["2028-01-31", 1, "2028-02-29"],
    ["2026-03-31", 1, "2026-04-30"],
    ["2026-01-15", 12, "2027-01-15"],
    ["2026-12-31", 2, "2027-02-28"],
    ["2026-03-31", -1, "2026-02-28"],
  ])("%s + %i month(s) = %s", (day, n, expected) => {
    expect(addMonths(day, n)).toBe(expected);
  });
});

describe("calendar helpers", () => {
  it("validates days", () => {
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("2026-1-1")).toBe(false);
  });

  it("handles month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonthsToMonth("2026-01", -1)).toBe("2025-12");
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("builds preset ranges from today", () => {
    expect(presetRange("thisMonth", "2026-10-15")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("lastMonth", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(presetRange("last3Months", "2026-02-10")).toEqual({ from: "2025-12-01", to: "2026-02-28" });
  });

  it("formats without time-zone shift", () => {
    expect(formatDay("2026-10-15", "tr", "long")).toBe("15 Ekim 2026");
    expect(formatDay("2026-10-01", "tr", "numeric")).toBe("01.10.2026");
  });
});
