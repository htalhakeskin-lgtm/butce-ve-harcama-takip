import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";

import { publicEnv, serverEnv } from "@/env";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { createPersonalLedger, deleteLedgersOwnedBy } from "@/features/ledgers/server";
import { getDb } from "@/server/db";
import { authAccounts, rateLimits, sessions, users, verifications } from "@/server/db/schema";
import { emailTemplates } from "@/server/email/templates";
import { sendEmail } from "@/server/email/transport";

import { CURRENT_LEGAL_VERSION, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";
import { isPasswordBreached } from "./password-check";

const DAY = 60 * 60 * 24;

function createAuth() {
  const env = serverEnv();
  const db = getDb();

  return betterAuth({
    appName: publicEnv.appName,
    baseURL: publicEnv.appUrl,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [publicEnv.appUrl],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        authAccount: authAccounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    account: { modelName: "authAccount" },
    user: {
      additionalFields: {
        locale: { type: "string", required: false, defaultValue: "tr", input: true },
        timeZone: { type: "string", required: false, defaultValue: DEFAULT_TIME_ZONE, input: true },
        theme: { type: "string", required: false, defaultValue: "system", input: false },
        consentVersion: { type: "string", required: false, input: true },
        consentAt: { type: "date", required: false, input: false },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          const mail = emailTemplates.changeEmail({ name: user.name, url, newEmail });
          await sendEmail({ to: user.email, ...mail, kind: "change_email" });
        },
      },
      deleteUser: {
        enabled: true,
        // BR-AUTH-012: personal data goes with the account.
        beforeDelete: async (user) => {
          const blocked = await deleteLedgersOwnedBy(db, user.id);
          if (blocked) throw new APIError("BAD_REQUEST", { message: "BR-AUTH-012", code: "BR-AUTH-012" });
        },
        afterDelete: async (user) => {
          const mail = emailTemplates.deleted({ name: user.name });
          await sendEmail({ to: user.email, ...mail, kind: "account_deleted" });
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true, // BR-AUTH-002
      minPasswordLength: PASSWORD_MIN_LENGTH, // BR-AUTH-001
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true, // BR-AUTH-004
      resetPasswordTokenExpiresIn: 60 * 60,
      password: {
        hash: async (password) => {
          if (await isPasswordBreached(password)) {
            throw new APIError("BAD_REQUEST", { message: "BR-AUTH-001-breached", code: "PASSWORD_BREACHED" });
          }
          return hashPassword(password);
        },
        verify: ({ hash, password }) => verifyPassword({ hash, password }),
      },
      sendResetPassword: async ({ user, url }) => {
        const mail = emailTemplates.reset({ name: user.name, url });
        await sendEmail({ to: user.email, ...mail, kind: "reset_password" });
      },
      // BR-AUTH-003: the sign-up response is identical; the owner of the address is told instead.
      onExistingUserSignUp: async ({ user }) => {
        const mail = emailTemplates.existing({ name: user.name, url: `${publicEnv.appUrl}/login` });
        await sendEmail({ to: user.email, ...mail, kind: "existing_account" });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: DAY, // BR-AUTH-002: 24 hours
      sendVerificationEmail: async ({ user, url }) => {
        const mail = emailTemplates.verify({ name: user.name, url });
        await sendEmail({ to: user.email, ...mail, kind: "verify_email" });
      },
    },
    session: {
      expiresIn: 30 * DAY, // BR-AUTH-006
      updateAge: DAY,
    },
    rateLimit: {
      // BR-AUTH-005. Disabled only by the end-to-end test environment.
      enabled: process.env.AUTH_RATE_LIMIT !== "off",
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 1 },
        "/change-password": { window: 60, max: 5 },
        "/delete-user": { window: 60, max: 5 },
      },
    },
    advanced: {
      database: { generateId: () => newId() },
      cookiePrefix: "butce",
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // BR-PRV-001: consent to the current legal texts is required at sign-up.
            if (user.consentVersion !== CURRENT_LEGAL_VERSION) {
              throw new APIError("BAD_REQUEST", { message: "BR-PRV-001", code: "BR-PRV-001" });
            }
            const timeZone =
              typeof user.timeZone === "string" && isValidTimeZone(user.timeZone) ? user.timeZone : DEFAULT_TIME_ZONE;
            return { data: { ...user, timeZone, locale: "tr", consentAt: new Date() } };
          },
          after: async (user) => {
            await createPersonalLedger(db, {
              userId: user.id,
              locale: typeof user.locale === "string" ? user.locale : "tr",
              timeZone: typeof user.timeZone === "string" ? user.timeZone : DEFAULT_TIME_ZONE,
            });
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { butceAuth?: Auth };

/** Created lazily so `next build` does not need runtime secrets. */
export function getAuth(): Auth {
  globalForAuth.butceAuth ??= createAuth();
  return globalForAuth.butceAuth;
}
