import { describe, expect, it } from "vitest";

import { computeBudget, groupSmallSlices, rollUp } from "./domain";

describe("computeBudget", () => {
  it("BR-BUD-002: remaining = limit − spent − planned", () => {
    const result = computeBudget({ limitMinor: 2_000_000, spentMinor: 390_050, plannedMinor: 0 });
    expect(result.remainingMinor).toBe(1_609_950);
    expect(result.status).toBe("ok");
  });

  it("BR-BUD-002: planned spending reduces what is left", () => {
    const result = computeBudget({ limitMinor: 100_000, spentMinor: 50_000, plannedMinor: 20_000 });
    expect(result.remainingMinor).toBe(30_000);
    expect(result.usedPercent).toBe(70);
  });

  it.each([
    [79_999, "ok"],
    [80_000, "near"],
    [100_000, "near"],
    [100_001, "over"],
  ] as const)("BR-BUD-006: %i of 100.000 is %s", (spent, status) => {
    expect(computeBudget({ limitMinor: 100_000, spentMinor: spent, plannedMinor: 0 }).status).toBe(status);
  });

  it("reports a negative remainder when exceeded", () => {
    expect(computeBudget({ limitMinor: 300_000, spentMinor: 345_000, plannedMinor: 0 }).remainingMinor).toBe(-45_000);
  });
});

describe("rollUp (BR-CAT-007, BR-BUD-004)", () => {
  it("adds children to their parent and keeps own amounts", () => {
    const categories = [
      { id: "transport", parentId: null },
      { id: "fuel", parentId: "transport" },
      { id: "taxi", parentId: "transport" },
      { id: "market", parentId: null },
    ];
    const amounts = new Map([
      ["fuel", 200_000],
      ["taxi", 15_000],
      ["transport", 5_000],
      ["market", 125_050],
    ]);
    const result = rollUp(amounts, categories);
    expect(result.get("transport")).toBe(220_000);
    expect(result.get("fuel")).toBe(200_000);
    expect(result.get("market")).toBe(125_050);
  });
});

describe("groupSmallSlices (BR-RPT-004)", () => {
  it("merges slices under 3% into other", () => {
    const slices = [
      { id: "a", amountMinor: 900 },
      { id: "b", amountMinor: 20 },
      { id: "c", amountMinor: 20 },
      { id: "d", amountMinor: 60 },
    ];
    const { kept, otherMinor } = groupSmallSlices(slices);
    expect(kept.map((s) => s.id)).toEqual(["a", "d"]);
    expect(otherMinor).toBe(40);
  });

  it("keeps a single small slice by name", () => {
    const { kept, otherMinor } = groupSmallSlices([
      { id: "a", amountMinor: 990 },
      { id: "b", amountMinor: 10 },
    ]);
    expect(kept.map((s) => s.id)).toEqual(["a", "b"]);
    expect(otherMinor).toBe(0);
  });
});
