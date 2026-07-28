/**
 * Supabase environment accessors — fail loudly instead of silently.
 *
 * Every client factory used to read `process.env.NEXT_PUBLIC_SUPABASE_*!`. The
 * `!` asserts the value away at compile time but does nothing at runtime, so a
 * missing variable reached `createClient(undefined, undefined)` and threw
 * nothing. The request then went out with **no `apikey` header** and Supabase
 * answered:
 *
 *     {"message":"No API key found in request","hint":"No `apikey` request
 *      header or url param was found."}
 *
 * — a message that names neither the app nor the variable, which is why it cost
 * a debugging session on 2026-07-28. These helpers turn that into an error that
 * says which variable is missing, at the point of use.
 *
 * ⚠️ `NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**,
 * not read at runtime. In the browser, a throw here means the *build* had no
 * value — setting the variable on the running server cannot repair it, only a
 * rebuild can. (Same failure mode the `Dockerfile` documents for its build args.)
 *
 * The reads below must stay written as full literal `process.env.NEXT_PUBLIC_X`
 * expressions: Next substitutes them textually, so destructuring or dynamic
 * indexing would leave them `undefined` in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local (see .env.example); ` +
        `NEXT_PUBLIC_* values are inlined at build time, so rebuild after setting it.`,
    );
  }
  return value;
}

/** The Supabase project URL. Safe in the browser (public by design). */
export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/** The anon key — RLS still applies. Safe in the browser (public by design). */
export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
