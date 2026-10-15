import { z } from "zod";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_TRANSACTION_LINES,
  TRANSACTION_TYPES,
} from "@/lib/domain-constants";
import { amountSchema, idSchema, isoDaySchema, textSchema, versionSchema } from "@/lib/validation";

export const transactionLineSchema = z.object({
  categoryId: idSchema,
  amountMinor: amountSchema,
});

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  accountId: idSchema,
  toAccountId: idSchema.nullable(),
  amountMinor: amountSchema,
  occurredOn: isoDaySchema,
  description: textSchema(MAX_DESCRIPTION_LENGTH),
  note: textSchema(MAX_NOTE_LENGTH),
  /** Empty for transfers; one line per category otherwise (BR-TRX-004). */
  lines: z.array(transactionLineSchema).max(MAX_TRANSACTION_LINES, { message: "BR-TRX-004" }),
});

export const createTransactionSchema = transactionInputSchema.extend({ id: idSchema });
export const updateTransactionSchema = transactionInputSchema.extend({ id: idSchema, version: versionSchema });
export const transactionRefSchema = z.object({ id: idSchema });

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/** Filters live in the URL (FR-TRX-11); this schema parses them on the server. */
export const transactionFiltersSchema = z.object({
  from: isoDaySchema.optional(),
  to: isoDaySchema.optional(),
  categoryIds: z.array(idSchema).default([]),
  accountIds: z.array(idSchema).default([]),
  types: z.array(z.enum(TRANSACTION_TYPES)).default([]),
  amountMin: z.number().int().nonnegative().optional(),
  amountMax: z.number().int().nonnegative().optional(),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
