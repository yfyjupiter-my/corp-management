import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bg text-center p-8">
      <div className="font-head text-[52px] font-bold tracking-tight text-fg-subtle">404</div>
      <h1 className="text-lg font-semibold font-head">Page not found</h1>
      <p className="text-[13px] text-fg-muted">That page doesn’t exist or you can’t access it.</p>
      <Link href="/dashboard" className="text-accent text-[13px] font-semibold mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
