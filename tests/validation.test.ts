import { describe, it, expect } from "vitest";
import { optionalString, optionalSafeText } from "@/lib/validation/common";
import { siteSchema } from "@/lib/validation/site";
import { vlanSchema } from "@/lib/validation/network";
import { inviteUserSchema } from "@/lib/validation/user";

describe("optionalString", () => {
  it("normalises an empty string to undefined", () => {
    expect(optionalString(50).parse("")).toBeUndefined();
  });

  it("passes through a normal value", () => {
    expect(optionalString(50).parse("router-1")).toBe("router-1");
  });

  it("rejects values over the max length", () => {
    expect(optionalString(3).safeParse("toolong").success).toBe(false);
  });
});

describe("optionalSafeText", () => {
  it("blocks text that looks like a secret", () => {
    expect(optionalSafeText(100).safeParse("password: hunter2").success).toBe(false);
  });

  it("allows ordinary notes and empties to undefined", () => {
    expect(optionalSafeText(100).parse("")).toBeUndefined();
    expect(optionalSafeText(100).parse("Spare unit in storage")).toBe(
      "Spare unit in storage",
    );
  });
});

describe("siteSchema", () => {
  const base = {
    country_code: "MY",
    name: "KL HQ",
    timezone: "Asia/Kuala_Lumpur",
    currency: "MYR",
  };

  it("accepts a minimal valid site and drops empty optionals", () => {
    const parsed = siteSchema.parse({ ...base, contact_phone: "" });
    expect(parsed.contact_phone).toBeUndefined();
    expect(parsed.name).toBe("KL HQ");
  });

  it("rejects an unknown country code", () => {
    expect(siteSchema.safeParse({ ...base, country_code: "ZZ" }).success).toBe(false);
  });

  it("rejects an invalid contact email but allows empty", () => {
    expect(siteSchema.safeParse({ ...base, contact_email: "nope" }).success).toBe(false);
    expect(siteSchema.parse({ ...base, contact_email: "" }).contact_email).toBeUndefined();
  });
});

describe("vlanSchema", () => {
  const base = { site_id: "11111111-1111-1111-1111-111111111111", status: undefined };

  it("coerces a numeric-string vlan_id within the 802.1Q range", () => {
    expect(vlanSchema.parse({ site_id: base.site_id, vlan_id: "100" }).vlan_id).toBe(100);
  });

  it("rejects a vlan_id outside 1..4094", () => {
    expect(vlanSchema.safeParse({ site_id: base.site_id, vlan_id: 5000 }).success).toBe(false);
    expect(vlanSchema.safeParse({ site_id: base.site_id, vlan_id: 0 }).success).toBe(false);
  });
});

describe("inviteUserSchema superRefine (role/country coherence)", () => {
  it("requires a country for a country_manager", () => {
    const r = inviteUserSchema.safeParse({
      email: "m@example.com",
      full_name: "Mgr",
      role: "country_manager",
    });
    expect(r.success).toBe(false);
  });

  it("forbids a country for an hq_admin", () => {
    const r = inviteUserSchema.safeParse({
      email: "a@example.com",
      full_name: "Admin",
      role: "hq_admin",
      country_code: "MY",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a coherent country_manager invite", () => {
    const r = inviteUserSchema.safeParse({
      email: "m@example.com",
      full_name: "Mgr",
      role: "country_manager",
      country_code: "MY",
    });
    expect(r.success).toBe(true);
  });
});
