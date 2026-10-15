import { sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { logger } from "@/server/logger";

/** Health check for uptime monitoring (observability standard §6): app + database. */
export async function GET(): Promise<Response> {
  const started = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("health.database_failed", { error });
    return Response.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
