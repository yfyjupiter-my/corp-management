import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Chip } from "@/components/ui/Chip";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  site: "Site",
  device: "Device",
  circuit: "Circuit",
  camera: "Camera",
};

/**
 * Global search (PRD Story 5). Delegates to the RLS-scoped `search_registry`
 * SQL function so results respect country isolation.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: { type: string; id: string; label: string; country_code: string }[] = [];
  if (query.length >= 2) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("search_registry", { q: query });
    results = data ?? [];
  }

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <PageHead eyebrow="Search" title="Global search" />

      <form className="mb-4" action="/search" method="get">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search sites, hostnames, IPs, circuit IDs, cameras…"
          className="w-full max-w-[560px] px-4 h-[42px] rounded-pill border border-border-strong bg-surface text-[14px] focus:outline-none focus:border-accent focus:shadow-ring"
        />
      </form>

      {query.length < 2 ? (
        <p className="text-[13px] text-fg-subtle">Type at least 2 characters to search.</p>
      ) : results.length === 0 ? (
        <Panel>
          <PanelEmpty>No matches for “{query}”.</PanelEmpty>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3.5">
          {Object.entries(grouped).map(([type, items]) => (
            <Panel key={type}>
              <PanelHeader title={`${typeLabel[type] ?? type} · ${items.length}`} />
              <ul className="divide-y divide-border">
                {items.map((r) => (
                  <li key={`${r.type}-${r.id}`} className="flex items-center gap-3 px-4 py-3">
                    <Link
                      href={r.type === "site" ? `/countries/${r.country_code}` : "/network"}
                      className="text-[13px] font-medium hover:text-accent"
                    >
                      {r.label}
                    </Link>
                    <Chip tone="neutral">{r.country_code}</Chip>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
