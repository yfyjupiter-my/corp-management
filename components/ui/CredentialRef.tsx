/**
 * Renders a `credential_ref` (PRD Story 2, TASKS 4.7). This is a *reference* to a
 * secret — a link to a password-manager entry — never the secret itself (the
 * save-time secrets guard enforces that).
 *
 * An http(s) reference renders as a link that opens in a new tab with
 * `rel="noopener noreferrer"` (prevents tabnabbing + referrer leakage). Anything
 * else (a custom scheme like `vault://…`, or a bare label) is not web-navigable,
 * so it renders as plain monospace text.
 */
export function CredentialRef({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-fg-subtle">—</span>;

  const isWebUrl = /^https?:\/\//i.test(value);
  if (isWebUrl) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline font-mono break-all"
      >
        {value}
      </a>
    );
  }

  return <span className="font-mono break-all">{value}</span>;
}
