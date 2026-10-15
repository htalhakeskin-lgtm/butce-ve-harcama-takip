import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resend } from "resend";

import { serverEnv } from "@/env";
import { newId } from "@/lib/ids";
import { logger } from "@/server/logger";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Logged instead of the address (observability standard: no e-mail addresses in logs). */
  kind: string;
};

export const DEV_MAIL_DIR = path.join(process.cwd(), ".dev-mail");

/**
 * Sends an e-mail through the configured transport (K-18: no provider is fixed in code).
 * - file: writes JSON to .dev-mail/ for local development and end-to-end tests
 * - resend: sends through Resend
 */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const env = serverEnv();
  if (env.EMAIL_TRANSPORT === "file") {
    await mkdir(DEV_MAIL_DIR, { recursive: true });
    const file = path.join(DEV_MAIL_DIR, `${Date.now()}-${newId()}.json`);
    await writeFile(
      file,
      JSON.stringify({ ...email, from: env.EMAIL_FROM, sentAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    logger.info("email.written", { kind: email.kind });
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    logger.error("email.failed", { kind: email.kind, reason: error.name });
    throw new Error(`E-mail could not be sent: ${error.name}`);
  }
  logger.info("email.sent", { kind: email.kind });
}
