import { describe, expect, it } from "vitest";

import {
  formatMoney,
  isValidAmount,
  parseMoney,
  percentOf,
  splitEvenly,
  toInputString,
} from "./money";

describe("parseMoney", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234.56", 123456],
    ["1,234.56", 123456],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["12.5", 1250],
    ["12.50", 1250],
    ["12,5", 1250],
    ["0,01", 1],
    [",5", 50],
    ["40000", 4000000],
    ["₺ 1.250,50", 125050],
    ["1.250,50 TL", 125050],
    ["-15,00", -1500],
  ])("parses %s as %i minor units (NFR-08)", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "12,345", "1.23.4", "1,234,56", "12.345,6.7", "1.2345", "--1"])(
    "rejects %s",
    (input) => {
      expect(parseMoney(input)).toBeNull();
    },
  );
});

describe("formatMoney", () => {
  it("puts the symbol after the number in Turkish", () => {
    expect(formatMoney(123456, "TRY", "tr")).toBe("1.234,56 ₺");
  });

  it("uses the Intl default in English", () => {
    expect(formatMoney(123456, "TRY", "en")).toBe("₺1,234.56");
  });

  it("marks negatives with a real minus sign and optional plus for positives", () => {
    expect(formatMoney(-200000, "TRY", "tr")).toBe("−2.000,00 ₺");
    expect(formatMoney(4000000, "TRY", "tr", { signed: true })).toBe("+40.000,00 ₺");
    expect(formatMoney(0, "TRY", "tr", { signed: true })).toBe("0,00 ₺");
  });

  it("can hide the symbol", () => {
    expect(formatMoney(6109950, "TRY", "tr", { hideSymbol: true })).toBe("61.099,50");
  });
});

describe("toInputString", () => {
  it("round-trips with parseMoney", () => {
    for (const minor of [0, 1, 99, 100, 125050, 100_000_000_000]) {
      expect(parseMoney(toInputString(minor, "tr"))).toBe(minor);
      expect(parseMoney(toInputString(minor, "en"))).toBe(minor);
    }
  });
});

describe("isValidAmount (BR-SYS-007)", () => {
  it("accepts 0,01 to 1.000.000.000,00", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(100_000_000_000)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(100_000_000_001)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false);
  });
});

describe("splitEvenly (BR-INS-002)", () => {
  it("gives leftover cents to the first part", () => {
    expect(splitEvenly(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(splitEvenly(1200000, 6)).toEqual([200000, 200000, 200000, 200000, 200000, 200000]);
  });

  it("always sums to the total", () => {
    for (const total of [1, 7, 99, 100001, 999999]) {
      for (const n of [1, 2, 3, 7, 12, 36]) {
        expect(splitEvenly(total, n).reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });
});

describe("percentOf", () => {
  it("rounds to one decimal and returns null for a zero base", () => {
    expect(percentOf(200000, 390050)).toBe(51.3);
    expect(percentOf(125050, 390050)).toBe(32.1);
    expect(percentOf(65000, 390050)).toBe(16.7);
    expect(percentOf(1, 0)).toBeNull();
  });
});
