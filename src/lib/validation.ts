import { z } from "zod";

import { isIsoDay } from "./dates";
import { MAX_AMOUNT_MINOR, MIN_AMOUNT_MINOR } from "./money";

/**
 * Zod building blocks shared by client forms and server actions.
 * Messages are error codes, translated on the client (errors.field.* or errors.BR-*).
 * "tooLong|60" carries the limit for the message.
 */

export const idSchema = z.uuid({ message: "invalid" });

export const isoDaySchema = z
  .string({ message: "required" })
  .refine((v) => isIsoDay(v), { message: "invalidDate" });

/** A positive amount in minor units within BR-SYS-007. */
export const amountSchema = z
  .number({ message: "invalidAmount" })
  .int({ message: "invalidAmount" })
  .min(MIN_AMOUNT_MINOR, { message: "BR-SYS-007" })
  .max(MAX_AMOUNT_MINOR, { message: "BR-SYS-007" });

/** A signed balance in minor units (opening balances may be negative). */
export const signedAmountSchema = z
  .number({ message: "invalidAmount" })
  .int({ message: "invalidAmount" })
  .min(-MAX_AMOUNT_MINOR, { message: "BR-SYS-007" })
  .max(MAX_AMOUNT_MINOR, { message: "BR-SYS-007" });

export function nameSchema(max: number) {
  return z
    .string({ message: "required" })
    .trim()
    .min(1, { message: "required" })
    .max(max, { message: `tooLong|${max}` });
}

export function textSchema(max: number) {
  return z.string().trim().max(max, { message: `tooLong|${max}` });
}

export const versionSchema = z.number().int().min(1);
