import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/env";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
/** A database handle that may be the root connection or an open transaction. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { butceSql?: postgres.Sql; butceDb?: Db };

function create(): Db {
  // prepare: false keeps us compatible with Neon's pooled (PgBouncer) connection string.
  const client = postgres(serverEnv().DATABASE_URL, { max: 10, prepare: false });
  globalForDb.butceSql = client;
  return drizzle(client, { schema });
}

export function getDb(): Db {
  globalForDb.butceDb ??= create();
  return globalForDb.butceDb;
}

export { schema };
