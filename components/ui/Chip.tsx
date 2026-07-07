import { cn } from "@/lib/utils/cn";

type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

/**
 * Status chip — DESIGN.md §5.4.
 * Semantic map: ok=Fresh/Active/Healthy · warn=Stale · danger=Faulty/Expired ·
 * info=Pilot · neutral=Archived.
 */
const tones: Record<Tone, string> = {
  ok: "text-ok bg-ok-bg",
  warn: "text-warn bg-warn-bg",
  danger: "text-danger bg-danger-bg",
  info: "text-info bg-info-bg",
  neutral: "text-fg-muted bg-surface-2 border border-border",
};

const dotTones: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-fg-subtle",
};

export function Chip({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] text-[11.5px] font-semibold px-[10px] py-[3px]",
        "rounded-pill font-head leading-[1.4]",
        tones[tone],
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotTones[tone])} />}
      {children}
    </span>
  );
}
