"use server";

import { z } from "zod";

import { idSchema } from "@/lib/validation";
import { ledgerAction } from "@/server/action";
import { getDb } from "@/server/db";

import { createAccountSchema, updateAccountSchema } from "./schemas";
import { createAccount, deleteAccount, moveAccount, setAccountArchived, updateAccount } from "./server";

export const createAccountAction = ledgerAction(
  { name: "accounts.create", schema: createAccountSchema, minRole: "editor" },
  (input, ctx) => createAccount(getDb(), ctx, input),
);

export const updateAccountAction = ledgerAction(
  { name: "accounts.update", schema: updateAccountSchema, minRole: "editor" },
  (input, ctx) => updateAccount(getDb(), ctx, input),
);

export const archiveAccountAction = ledgerAction(
  { name: "accounts.archive", schema: z.object({ id: idSchema, archived: z.boolean() }), minRole: "editor" },
  (input, ctx) => setAccountArchived(getDb(), ctx, input.id, input.archived),
);

export const deleteAccountAction = ledgerAction(
  { name: "accounts.delete", schema: z.object({ id: idSchema }), minRole: "editor" },
  (input, ctx) => deleteAccount(getDb(), ctx, input.id),
);

export const moveAccountAction = ledgerAction(
  { name: "accounts.move", schema: z.object({ id: idSchema, direction: z.enum(["up", "down"]) }), minRole: "editor" },
  (input, ctx) => moveAccount(getDb(), ctx, input.id, input.direction),
);
