/** Helpers for recognising PostgreSQL errors through Drizzle's wrapper. */

type PgLikeError = { code?: string; constraint_name?: string; constraint?: string; cause?: unknown };

function pgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const candidate = current as PgLikeError;
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return null;
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pg = pgError(error);
  if (pg?.code !== "23505") return false;
  return !constraint || pg.constraint_name === constraint || pg.constraint === constraint;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgError(error)?.code === "23503";
}
