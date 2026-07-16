import { describe, it, expect } from "vitest";
import { classifyGuardedUpdate } from "@/lib/api/optimistic";

describe("classifyGuardedUpdate (BUS-6)", () => {
  it("is ok when the update touched a row", () => {
    expect(
      classifyGuardedUpdate({ guarded: true, updatedCount: 1, rowVisible: true }),
    ).toBe("ok");
  });

  it("is ok for an unguarded 0-row update (prior no-op behaviour)", () => {
    expect(
      classifyGuardedUpdate({ guarded: false, updatedCount: 0, rowVisible: true }),
    ).toBe("ok");
  });

  it("is a conflict when guarded, 0 rows, but the row is still visible", () => {
    // The row exists under RLS but its updated_at moved → someone else changed it.
    expect(
      classifyGuardedUpdate({ guarded: true, updatedCount: 0, rowVisible: true }),
    ).toBe("conflict");
  });

  it("is not_found when guarded, 0 rows, and the row is not visible", () => {
    // Gone, or never visible to this caller under RLS.
    expect(
      classifyGuardedUpdate({ guarded: true, updatedCount: 0, rowVisible: false }),
    ).toBe("not_found");
  });
});
