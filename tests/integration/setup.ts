import { afterAll, inject } from "vitest";

import { closeTestDb } from "./helpers";

process.env.DATABASE_URL = inject("databaseUrl");
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-1234";
process.env.EMAIL_FROM ??= "Test <test@example.com>";

afterAll(async () => {
  await closeTestDb();
});
