import { NextResponse } from "next/server";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import { dbErrorResponse } from "./db-error";

type TableName = keyof Database["public"]["Tables"];

/**
 * Factory for the identical "create one row" POST handlers (sites, devices,
 * ip-schemes, vlans). Collapses the getUser→401 / parse→400 / insert→201
 * boilerplate into one place (CODE-1) and adds:
 *  - a top-level try/catch so a thrown Supabase transport error returns a clean
 *    500 instead of an unstyled stack (ROB-2);
 *  - safe DB-error mapping so Postgres/RLS internals never reach the client (ROB-3).
 *
 * Authorization stays with Postgres RLS — the RLS-scoped server client's WITH
 * CHECK policies enforce country scoping even if the payload is tampered with.
 */
export function createResourceRoute<T extends TableName>(
  table: T,
  schema: z.ZodTypeAny,
) {
  return async function POST(request: Request) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const parsed = schema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 },
        );
      }

      const { error, data } = await supabase
        .from(table)
        .insert(parsed.data)
        .select("id")
        .single();

      if (error) return dbErrorResponse(error, `POST /${String(table)}`);
      // Every resource table exposes an `id`; the generic table param widens the
      // inferred select type, so narrow it back here.
      const { id } = data as unknown as { id: string };
      return NextResponse.json({ ok: true, id }, { status: 201 });
    } catch (err) {
      console.error(`[route-error] POST /${String(table)}:`, err);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}
