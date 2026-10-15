import { z } from "zod";

/**
 * Every environment variable the app reads goes through this file (configuration standard).
 * Server values are parsed lazily so that `next build` does not need production secrets;
 * the first server request fails loudly if something is missing.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  EMAIL_TRANSPORT: z.enum(["file", "resend"]).default("file"),
  EMAIL_FROM: z.string().min(3),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  /**
   * Public address read at runtime. Overrides NEXT_PUBLIC_APP_URL (which is fixed at build time),
   * e.g. for a demo behind a tunnel whose address changes on every start.
   */
  APP_URL: z.url().optional(),
  /** Shared demo account: shown on the login page and protected from changes (demo standard). */
  DEMO_ACCOUNT_EMAIL: z.email().optional(),
  DEMO_ACCOUNT_PASSWORD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  if (parsed.data.EMAIL_TRANSPORT === "resend" && !parsed.data.RESEND_API_KEY) {
    throw new Error("Invalid server environment: RESEND_API_KEY is required when EMAIL_TRANSPORT=resend");
  }
  cached = parsed.data;
  return cached;
}

/** The address users reach the app at: runtime APP_URL first, then the build-time public value. */
export function appUrl(): string {
  return serverEnv().APP_URL ?? publicEnv.appUrl;
}

/** Shared demo account, when this server runs as a demo (both values set). */
export function demoAccount(): { email: string; password: string } | null {
  const env = serverEnv();
  return env.DEMO_ACCOUNT_EMAIL && env.DEMO_ACCOUNT_PASSWORD
    ? { email: env.DEMO_ACCOUNT_EMAIL, password: env.DEMO_ACCOUNT_PASSWORD }
    : null;
}

/** Values that are safe to expose to the browser. Must be referenced literally for Next.js inlining. */
export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Bütçe",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
