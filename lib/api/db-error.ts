import { NextResponse } from "next/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/** Shape of a PostgREST / Postgres error as returned by supabase-js. */
type DbError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * Safe, user-facing messages keyed by Postgres SQLSTATE — as dictionary keys, so
 * the text is localised at response time (13.30). Anything not listed falls back
 * to a generic message so we never leak constraint names, column names, or RLS
 * hints to the client (ROB-3).
 */
const SAFE_MESSAGES: Record<string, keyof Dictionary["errors"]["db"]> = {
  "23505": "duplicate",
  "23503": "missingReference",
  "23514": "outOfRange",
  "23502": "missingField",
  "42501": "noPermission",
};

/**
 * Logs the raw DB error server-side and returns a NextResponse carrying only a
 * safe message. `context` identifies the call site in server logs.
 */
export function dbErrorResponse(error: DbError, context: string, t: Dictionary) {
  console.error(`[db-error] ${context}:`, error);
  const status = error.code === "42501" ? 403 : 400;
  const key = error.code ? SAFE_MESSAGES[error.code] : undefined;
  return NextResponse.json({ error: t.errors.db[key ?? "generic"] }, { status });
}
