import { describe, it, expect } from "vitest";
import { isBelowRetention, recorderLabel } from "@/lib/utils/cctv";

describe("isBelowRetention (TASKS 5.5)", () => {
  it("flags retention below the default minimum", () => {
    expect(isBelowRetention(14)).toBe(true);
  });

  it("does not flag retention at or above the minimum", () => {
    expect(isBelowRetention(30)).toBe(false);
    expect(isBelowRetention(60)).toBe(false);
  });

  it("respects a per-country minimum override", () => {
    expect(isBelowRetention(30, 45)).toBe(true); // country requires 45
    expect(isBelowRetention(45, 45)).toBe(false);
  });

  it("does not flag an unknown (null/undefined) retention", () => {
    expect(isBelowRetention(null)).toBe(false);
    expect(isBelowRetention(undefined)).toBe(false);
  });
});

describe("recorderLabel", () => {
  it("combines brand/model with location", () => {
    expect(recorderLabel({ id: "x", brand: "Hikvision", model: "DS-7616", location: "Server room" })).toBe(
      "Hikvision DS-7616 · Server room",
    );
  });

  it("falls back to name only, then location, then id prefix", () => {
    expect(recorderLabel({ id: "x", brand: "Hikvision", model: null, location: null })).toBe("Hikvision");
    expect(recorderLabel({ id: "x", brand: null, model: null, location: "Lobby" })).toBe("Lobby");
    expect(recorderLabel({ id: "abcdef1234", brand: null, model: null, location: null })).toBe("abcdef12");
  });
});
