/** Tiny className joiner — filters falsy values. Avoids a runtime dep. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
