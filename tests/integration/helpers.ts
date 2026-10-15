import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { inject } from "vitest";

import { createPersonalLedger } from "@/features/ledgers/server";
import { newId } from "@/lib/ids";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import type { ServiceCtx } from "@/server/service-ctx";

let client: postgres.Sql | undefined;
let db: Db | undefined;

export function testDb(): Db {
  if (!db) {
    client = postgres(inject("databaseUrl"), { max: 5, onnotice: () => undefined });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeTestDb(): Promise<void> {
  await client?.end();
  client = undefined;
  db = undefined;
}

export const TODAY = "2026-10-15";

/** Every test makes its own user and ledger, so tests never share data (testing standard). */
export async function makeUser(options: { today?: string } = {}): Promise<ServiceCtx & { email: string }> {
  const database = testDb();
  const userId = newId();
  const email = `user-${userId}@example.com`;
  await database.insert(schema.users).values({ id: userId, name: "Test Kullanıcı", email, emailVerified: true });
  const ledgerId = await createPersonalLedger(database, { userId, locale: "tr", timeZone: "Europe/Istanbul" });
  return { userId, ledgerId, today: options.today ?? TODAY, email };
}

export async function categoryId(ctx: ServiceCtx, name: string): Promise<string> {
  const { listCategories } = await import("@/features/categories/server");
  const found = (await listCategories(testDb(), ctx, { includeArchived: true })).find((c) => c.name === name);
  if (!found) throw new Error(`Category not found: ${name}`);
  return found.id;
}

export async function accountId(ctx: ServiceCtx, name: string): Promise<string> {
  const { listAccounts } = await import("@/features/accounts/server");
  const found = (await listAccounts(testDb(), ctx, { includeArchived: true })).find((a) => a.name === name);
  if (!found) throw new Error(`Account not found: ${name}`);
  return found.id;
}

/** Asserts that a promise rejects with an AppError of the given code. */
export async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  const { isAppError } = await import("@/lib/result");
  try {
    await promise;
  } catch (error) {
    if (isAppError(error) && error.code === code) return;
    throw new Error(`Expected AppError ${code}, got ${String(error)}`, { cause: error });
  }
  throw new Error(`Expected AppError ${code}, but the call succeeded`);
}
