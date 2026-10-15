import "server-only";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { newId } from "@/lib/ids";
import type { LedgerRole } from "@/lib/domain-constants";
import { hasRole } from "@/lib/permissions";
import { type ActionError, type ErrorCode, fail, isAppError, ok, type Result } from "@/lib/result";
import { getContext, type RequestContext } from "@/server/context";
import { logger } from "@/server/logger";

/**
 * Wrapper every ledger server action goes through (api standard):
 * session → ledger membership and role → input validation → handler → Result.
 * Rule violations (AppError) become error codes; anything else is logged with an error id.
 */
export function ledgerAction<S extends z.ZodType, T>(
  options: { schema: S; minRole: LedgerRole; name: string },
  handler: (input: z.infer<S>, ctx: RequestContext) => Promise<T>,
): (input: z.input<S>) => Promise<Result<T>> {
  return async (raw) => {
    try {
      const ctx = await getContext();
      if (!ctx) return fail({ code: "unauthenticated" });
      if (!hasRole(ctx.role, options.minRole)) return fail({ code: "forbidden" });

      const parsed = options.schema.safeParse(raw);
      if (!parsed.success) return fail(validationError(parsed.error));

      const data = await handler(parsed.data, ctx);
      revalidatePath("/", "layout");
      return ok(data);
    } catch (error) {
      unstable_rethrow(error);
      return fail(toActionError(error, options.name));
    }
  };
}

export function validationError(error: z.ZodError): ActionError {
  const fieldErrors: Record<string, ErrorCode[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message as ErrorCode);
  }
  return { code: "validation", fieldErrors };
}

export function toActionError(error: unknown, actionName: string): ActionError {
  if (isAppError(error)) {
    return {
      code: error.code,
      ...(error.params ? { params: error.params } : {}),
      ...(error.field ? { fieldErrors: { [error.field]: [error.code] } } : {}),
    };
  }
  const errorId = newId();
  logger.error("action.failed", { action: actionName, errorId, error });
  return { code: "unexpected", errorId };
}
