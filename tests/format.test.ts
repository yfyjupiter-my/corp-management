import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatMoney,
  formatDate,
  daysUntil,
  isStale,
  countryName,
} from "@/lib/utils/format";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatMoney", () => {
  it("returns em dash for nullish amounts", () => {
    expect(formatMoney(null, "MYR")).toBe("—");
    expect(formatMoney(undefined, "USD")).toBe("—");
  });

  it("formats a valid ISO currency", () => {
    expect(formatMoney(1200, "USD")).toBe("$1,200.00");
  });

  it("falls back gracefully on an invalid currency code", () => {
    expect(formatMoney(50, "NOTREAL")).toBe("50.00 NOTREAL");
  });
});

describe("formatDate", () => {
  it("returns em dash for nullish / invalid dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats a valid date as dd Mon yyyy", () => {
    expect(formatDate("2026-03-09")).toBe("09 Mar 2026");
  });
});

describe("daysUntil", () => {
  it("returns null for nullish / invalid input", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("garbage")).toBeNull();
  });

  it("returns a positive count for a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(daysUntil("2026-01-11T00:00:00Z")).toBe(10);
  });

  it("returns a negative count for a past date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T00:00:00Z"));
    expect(daysUntil("2026-01-01T00:00:00Z")).toBe(-10);
  });
});

describe("isStale", () => {
  it("treats never-verified / invalid as stale", () => {
    expect(isStale(null)).toBe(true);
    expect(isStale("nope")).toBe(true);
  });

  it("is not stale when verified within the review cycle", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00Z"));
    expect(isStale("2026-06-01T00:00:00Z", 6)).toBe(false);
  });

  it("is stale when verified before the cutoff", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00Z"));
    expect(isStale("2025-01-01T00:00:00Z", 6)).toBe(true);
  });
});

describe("countryName", () => {
  it("maps a known code to its name", () => {
    expect(countryName("MY")).toBe("Malaysia");
  });

  it("echoes an unknown code unchanged", () => {
    expect(countryName("ZZ")).toBe("ZZ");
  });
});
