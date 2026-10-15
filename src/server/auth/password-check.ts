import "server-only";

import { createHash } from "node:crypto";

import { logger } from "@/server/logger";

/**
 * BR-AUTH-001: rejects passwords found in breach corpora via Have I Been Pwned's k-anonymity API
 * (only the first five characters of the SHA-1 hash leave the server).
 * Fails open: if the service cannot be reached, sign-up is not blocked (configuration standard).
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  if (process.env.PASSWORD_BREACH_CHECK === "off") return false;
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "butce-takip-password-check" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok) {
      logger.warn("password_check.unavailable", { status: response.status });
      return false;
    }
    const body = await response.text();
    return body.split(/\r?\n/).some((line) => {
      const [lineSuffix, count] = line.split(":");
      return lineSuffix === suffix && Number(count) > 0;
    });
  } catch (error) {
    logger.warn("password_check.unavailable", { error });
    return false;
  }
}
