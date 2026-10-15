/** Pure budget and roll-up calculations (BR-BUD-002, 004, 006; BR-CAT-007). */

export type BudgetStatus = "ok" | "near" | "over";

export const NEAR_THRESHOLD_PERCENT = 80;

export type BudgetFigures = {
  limitMinor: number;
  spentMinor: number;
  plannedMinor: number;
};

export type BudgetComputed = BudgetFigures & {
  /** limit − spent − planned; negative when exceeded (BR-BUD-002). */
  remainingMinor: number;
  /** (spent + planned) / limit, rounded down to a whole percent. */
  usedPercent: number;
  status: BudgetStatus;
};

/** BR-BUD-006: 80% = near, over 100% = exceeded. Exactly 100% is still within budget. */
export function computeBudget(figures: BudgetFigures): BudgetComputed {
  const used = figures.spentMinor + figures.plannedMinor;
  const remainingMinor = figures.limitMinor - used;
  const usedPercent = figures.limitMinor > 0 ? Math.floor((used / figures.limitMinor) * 100) : 0;
  const status: BudgetStatus =
    used > figures.limitMinor ? "over" : usedPercent >= NEAR_THRESHOLD_PERCENT ? "near" : "ok";
  return { ...figures, remainingMinor, usedPercent, status };
}

export type CategoryNode = { id: string; parentId: string | null };

/**
 * Adds every child's amount to its parent (BR-CAT-007, BR-BUD-004).
 * Returns a map where a parent's value = its own lines + all children.
 */
export function rollUp(amounts: Map<string, number>, categories: CategoryNode[]): Map<string, number> {
  const result = new Map<string, number>();
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  for (const [categoryId, amount] of amounts) {
    result.set(categoryId, (result.get(categoryId) ?? 0) + amount);
    const parentId = parentOf.get(categoryId);
    if (parentId) result.set(parentId, (result.get(parentId) ?? 0) + amount);
  }
  return result;
}

export type Slice = { id: string; amountMinor: number };

/**
 * BR-RPT-004: slices under 3% of the total are merged into "other" for the chart.
 * The table still lists every category.
 */
export function groupSmallSlices<T extends Slice>(
  slices: T[],
  thresholdPercent = 3,
): { kept: T[]; otherMinor: number } {
  const total = slices.reduce((sum, s) => sum + s.amountMinor, 0);
  if (total === 0) return { kept: [], otherMinor: 0 };
  const kept: T[] = [];
  let otherMinor = 0;
  for (const slice of slices) {
    if ((slice.amountMinor / total) * 100 < thresholdPercent) otherMinor += slice.amountMinor;
    else kept.push(slice);
  }
  // A single small slice is clearer shown by name than as "other".
  if (otherMinor > 0 && slices.length - kept.length === 1) {
    const lone = slices.find((s) => !kept.includes(s));
    if (lone) return { kept: [...kept, lone], otherMinor: 0 };
  }
  return { kept, otherMinor };
}
