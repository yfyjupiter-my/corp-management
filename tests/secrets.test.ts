import { describe, it, expect } from "vitest";
import { containsPossibleSecret } from "@/lib/utils/secrets";

describe("containsPossibleSecret", () => {
  it("returns false for empty / nullish input", () => {
    expect(containsPossibleSecret("")).toBe(false);
    expect(containsPossibleSecret(null)).toBe(false);
    expect(containsPossibleSecret(undefined)).toBe(false);
  });

  it("allows ordinary short free text", () => {
    expect(containsPossibleSecret("Rack 3, port 12")).toBe(false);
    expect(containsPossibleSecret("Cisco Catalyst 9200")).toBe(false);
  });

  it("flags key:value / key=value secret assignments", () => {
    expect(containsPossibleSecret("password: hunter2")).toBe(true);
    expect(containsPossibleSecret("api_key=abc123")).toBe(true);
    expect(containsPossibleSecret("token = xyz")).toBe(true);
  });

  it("flags PEM private key blocks", () => {
    expect(
      containsPossibleSecret("-----BEGIN RSA PRIVATE KEY-----\nMIIE..."),
    ).toBe(true);
  });

  it("flags AWS-style access keys", () => {
    expect(containsPossibleSecret("AKIAIOSFODNN7EXAMPLE")).toBe(true);
  });

  it("flags long high-entropy tokens (documented false-positive surface)", () => {
    // 24+ base64-ish chars — this also trips on long URLs/serials by design (SEC-4).
    expect(containsPossibleSecret("abcdefghijklmnopqrstuvwx")).toBe(true);
  });
});
