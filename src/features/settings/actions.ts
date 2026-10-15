"use server";

import { z } from "zod";

import { isValidTimeZone } from "@/lib/dates";
import { THEMES } from "@/lib/domain-constants";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { ledgerAction } from "@/server/action";
import { getDb } from "@/server/db";

import { updateLedgerCurrency, updatePreferences } from "./server";

export const updatePreferencesAction = ledgerAction(
  {
    name: "settings.preferences",
    schema: z.object({
      theme: z.enum(THEMES).optional(),
      timeZone: z.string().refine(isValidTimeZone, { message: "invalid" }).optional(),
    }),
    minRole: "viewer",
  },
  (input, ctx) =>
    updatePreferences(getDb(), ctx, {
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.timeZone ? { timeZone: input.timeZone } : {}),
    }),
);

export const updateCurrencyAction = ledgerAction(
  { name: "settings.currency", schema: z.object({ currencyCode: z.enum(SUPPORTED_CURRENCIES) }), minRole: "owner" },
  (input, ctx) => updateLedgerCurrency(getDb(), ctx, input.currencyCode),
);
