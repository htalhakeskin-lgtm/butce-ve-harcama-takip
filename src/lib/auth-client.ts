"use client";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { Auth } from "@/server/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

/** Maps Better Auth error responses to our error codes (BR-AUTH-*, technical codes). */
export function authErrorCode(error: {
  code?: string | undefined;
  status?: number;
  message?: string | undefined;
}): string {
  if (error.status === 429) return "rateLimited";
  switch (error.code) {
    case "PASSWORD_BREACHED":
      return "BR-AUTH-001-breached";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "BR-AUTH-001";
    case "BR-PRV-001":
      return "BR-PRV-001";
    case "BR-AUTH-012":
      return "BR-AUTH-012";
    case "DEMO_READ_ONLY":
      return "demoReadOnly";
    case "INVALID_EMAIL":
      return "invalidEmail";
    default:
      return "unexpected";
  }
}
