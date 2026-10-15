import { z } from "zod";

import { ACCOUNT_TYPES, PALETTE } from "@/lib/domain-constants";
import { amountSchema, idSchema, isoDaySchema, nameSchema, signedAmountSchema, versionSchema } from "@/lib/validation";

export const accountInputSchema = z.object({
  name: nameSchema(60),
  type: z.enum(ACCOUNT_TYPES),
  /** Signed: a credit card debt arrives negative (BR-ACC-002). */
  openingBalanceMinor: signedAmountSchema,
  openingOn: isoDaySchema,
  includeInTotal: z.boolean(),
  color: z.enum(PALETTE),
  creditLimitMinor: amountSchema.nullable(),
});

export const createAccountSchema = accountInputSchema.extend({ id: idSchema });
export const updateAccountSchema = accountInputSchema.extend({ id: idSchema, version: versionSchema });
export const accountRefSchema = z.object({ id: idSchema });

export type AccountInput = z.infer<typeof accountInputSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
