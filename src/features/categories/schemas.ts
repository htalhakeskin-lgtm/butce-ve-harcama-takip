import { z } from "zod";

import { CATEGORY_KINDS, PALETTE } from "@/lib/domain-constants";
import { idSchema, nameSchema, versionSchema } from "@/lib/validation";

export const createCategorySchema = z.object({
  id: idSchema,
  kind: z.enum(CATEGORY_KINDS),
  name: nameSchema(40),
  parentId: idSchema.nullable(),
  color: z.enum(PALETTE),
  icon: z.string().min(1).max(40),
});

export const updateCategorySchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: nameSchema(40),
  parentId: idSchema.nullable(),
  color: z.enum(PALETTE),
  icon: z.string().min(1).max(40),
});

export const categoryRefSchema = z.object({ id: idSchema });
export const archiveCategorySchema = z.object({ id: idSchema, archived: z.boolean() });
export const moveCategorySchema = z.object({ id: idSchema, direction: z.enum(["up", "down"]) });
export const mergeCategorySchema = z.object({ sourceId: idSchema, targetId: idSchema });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
