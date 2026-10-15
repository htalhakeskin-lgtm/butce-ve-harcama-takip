"use server";

import { z } from "zod";

import { AppError } from "@/lib/result";
import { ledgerAction } from "@/server/action";
import { getDb } from "@/server/db";

import {
  createTransactionSchema,
  transactionFiltersSchema,
  transactionRefSchema,
  updateTransactionSchema,
} from "./schemas";
import {
  createTransaction,
  decodeCursor,
  deleteTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "./server";

export const createTransactionAction = ledgerAction(
  { name: "transactions.create", schema: createTransactionSchema, minRole: "editor" },
  (input, ctx) => createTransaction(getDb(), ctx, input),
);

export const updateTransactionAction = ledgerAction(
  { name: "transactions.update", schema: updateTransactionSchema, minRole: "editor" },
  (input, ctx) => updateTransaction(getDb(), ctx, input),
);

export const deleteTransactionAction = ledgerAction(
  { name: "transactions.delete", schema: transactionRefSchema, minRole: "editor" },
  (input, ctx) => deleteTransaction(getDb(), ctx, input.id),
);

export const restoreTransactionAction = ledgerAction(
  { name: "transactions.restore", schema: transactionRefSchema, minRole: "editor" },
  (input, ctx) => restoreTransaction(getDb(), ctx, input.id),
);

export const getTransactionAction = ledgerAction(
  { name: "transactions.get", readOnly: true, schema: transactionRefSchema, minRole: "viewer" },
  async (input, ctx) => {
    const transaction = await getTransaction(getDb(), ctx, input.id);
    if (!transaction || transaction.deleted) throw new AppError("notFound");
    return transaction;
  },
);

export const loadTransactionsAction = ledgerAction(
  {
    name: "transactions.list",
    readOnly: true,
    schema: z.object({ filters: transactionFiltersSchema, cursor: z.string().max(80) }),
    minRole: "viewer",
  },
  (input, ctx) => listTransactions(getDb(), ctx, input.filters, { cursor: decodeCursor(input.cursor) }),
);
