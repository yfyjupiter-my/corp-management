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

  it("flags long tokens that mix case + digits (base64/JWT secrets)", () => {
    expect(containsPossibleSecret("aB3dEfGhIj9kLmNoPqR2sTuV")).toBe(true);
    // A realistic base64url access token.
    expect(containsPossibleSecret("ghp_Xy9AbCdEf12GhIjKlMnOpQr34StUvWx")).toBe(true);
  });

  it("SEC-4: does NOT flag lowercase URLs / slugs / UUIDs (former false positives)", () => {
    expect(
      containsPossibleSecret("https://vault.example.com/network/site-42-router-ref"),
    ).toBe(false);
    expect(containsPossibleSecret("this-is-a-long-lowercase-slug-value")).toBe(false);
    expect(containsPossibleSecret("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });
});
