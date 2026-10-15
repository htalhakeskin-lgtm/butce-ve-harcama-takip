"use server";

import { ledgerAction } from "@/server/action";
import { getDb } from "@/server/db";

import {
  archiveCategorySchema,
  categoryRefSchema,
  createCategorySchema,
  mergeCategorySchema,
  moveCategorySchema,
  updateCategorySchema,
} from "./schemas";
import {
  createCategory,
  deleteCategory,
  getCategoryUsage,
  mergeCategory,
  moveCategory,
  setCategoryArchived,
  updateCategory,
} from "./server";

export const createCategoryAction = ledgerAction(
  { name: "categories.create", schema: createCategorySchema, minRole: "editor" },
  (input, ctx) => createCategory(getDb(), ctx, input),
);

export const updateCategoryAction = ledgerAction(
  { name: "categories.update", schema: updateCategorySchema, minRole: "editor" },
  (input, ctx) => updateCategory(getDb(), ctx, input),
);

export const archiveCategoryAction = ledgerAction(
  { name: "categories.archive", schema: archiveCategorySchema, minRole: "editor" },
  (input, ctx) => setCategoryArchived(getDb(), ctx, input.id, input.archived),
);

export const deleteCategoryAction = ledgerAction(
  { name: "categories.delete", schema: categoryRefSchema, minRole: "editor" },
  (input, ctx) => deleteCategory(getDb(), ctx, input.id),
);

export const mergeCategoryAction = ledgerAction(
  { name: "categories.merge", schema: mergeCategorySchema, minRole: "editor" },
  (input, ctx) => mergeCategory(getDb(), ctx, input.sourceId, input.targetId),
);

export const moveCategoryAction = ledgerAction(
  { name: "categories.move", schema: moveCategorySchema, minRole: "editor" },
  (input, ctx) => moveCategory(getDb(), ctx, input.id, input.direction),
);

export const categoryUsageAction = ledgerAction(
  { name: "categories.usage", readOnly: true, schema: categoryRefSchema, minRole: "viewer" },
  (input, ctx) => getCategoryUsage(getDb(), ctx, input.id),
);
