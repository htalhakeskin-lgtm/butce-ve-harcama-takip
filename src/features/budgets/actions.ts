"use server";

import { ledgerAction } from "@/server/action";
import { getDb } from "@/server/db";

import { setBudgetLimitSchema } from "./schemas";
import { setBudgetLimit } from "./server";

export const setBudgetLimitAction = ledgerAction(
  { name: "budgets.setLimit", schema: setBudgetLimitSchema, minRole: "editor" },
  (input, ctx) => setBudgetLimit(getDb(), ctx, input),
);
