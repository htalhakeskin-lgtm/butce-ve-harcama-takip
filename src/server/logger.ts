/**
 * Structured JSON logger (observability standard).
 * Never pass e-mail addresses, amounts, descriptions, notes, tokens or passwords:
 * fields with those names are dropped as a safety net (BR-PRV-003).
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const FORBIDDEN_KEYS = /email|password|token|secret|amount|description|note|^name$/i;
const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured];
  return process.env.NODE_ENV === "test" ? LEVEL_ORDER.error : LEVEL_ORDER.info;
}

export function sanitize(fields: Fields): Fields {
  const clean: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.test(key)) continue;
    clean[key] = value instanceof Error ? { name: value.name, message: value.message } : value;
  }
  return clean;
}

function write(level: Level, event: string, fields: Fields = {}): void {
  if (LEVEL_ORDER[level] < minLevel()) return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...sanitize(fields) });
  if (level === "error") console.error(line);
  else console.warn(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => write("debug", event, fields),
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
