import { NextResponse } from "next/server";

/** Shape of a PostgREST / Postgres error as returned by supabase-js. */
type DbError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * Safe, user-facing messages keyed by Postgres SQLSTATE. Anything not listed
 * falls back to a generic message so we never leak constraint names, column
 * names, or RLS hints to the client (ROB-3).
 */
const SAFE_MESSAGES: Record<string, string> = {
  "23505": "A record with these details already exists.",
  "23503": "A referenced record was not found.",
  "23514": "Some values are outside the allowed range.",
  "23502": "A required field is missing.",
  "42501": "You do not have permission to perform this action.",
};

/**
 * Logs the raw DB error server-side and returns a NextResponse carrying only a
 * safe message. `context` identifies the call site in server logs.
 */
export function dbErrorResponse(error: DbError, context: string) {
  console.error(`[db-error] ${context}:`, error);
  const status = error.code === "42501" ? 403 : 400;
  const message =
    (error.code && SAFE_MESSAGES[error.code]) ??
    "Could not save your changes. Please check your input and try again.";
  return NextResponse.json({ error: message }, { status });
}
