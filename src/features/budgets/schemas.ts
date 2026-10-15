import { z } from "zod";

import { isIsoMonth } from "@/lib/dates";
import { amountSchema, idSchema } from "@/lib/validation";

export const setBudgetLimitSchema = z.object({
  /** Null = overall monthly budget. */
  categoryId: idSchema.nullable(),
  month: z.string().refine(isIsoMonth, { message: "invalidDate" }),
  /** Null removes the limit. */
  amountMinor: amountSchema.nullable(),
  /** BR-BUD-003 */
  scope: z.enum(["thisMonth", "fromNow"]),
});

export type SetBudgetLimitInput = z.infer<typeof setBudgetLimitSchema>;
