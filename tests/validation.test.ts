import { describe, it, expect } from "vitest";
import { optionalString, optionalSafeText } from "@/lib/validation/common";
import { siteSchema } from "@/lib/validation/site";
import { vlanSchema } from "@/lib/validation/network";
import { recorderSchema, cameraSchema } from "@/lib/validation/cctv";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user";

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

describe("cctv schemas: empty optionals become undefined, not \"\"", () => {
  const recorder = { site_id: "11111111-1111-1111-1111-111111111111" };
  const camera = {
    recorder_id: "11111111-1111-1111-1111-111111111111",
    label: "Front door",
    camera_type: "dome",
    status: "active",
  };

  it("normalises every blank recorder string to undefined", () => {
    const parsed = recorderSchema.parse({
      ...recorder,
      brand: "",
      model: "",
      firmware: "",
      mgmt_ip: "",
      location: "",
      notes: "",
    });
    for (const k of ["brand", "model", "firmware", "mgmt_ip", "location", "notes"] as const) {
      expect(parsed[k], k).toBeUndefined();
    }
  });

  it("normalises a blank camera resolution to undefined", () => {
    expect(cameraSchema.parse({ ...camera, resolution: "" }).resolution).toBeUndefined();
  });

  it("runs the secrets guard on the recorder location", () => {
    expect(
      recorderSchema.safeParse({ ...recorder, location: "rack 3, pwd=hunter2" }).success,
    ).toBe(false);
  });
});

describe("secrets guard reaches the remaining free-text fields", () => {
  it("blocks a secret in a vlan purpose", () => {
    expect(
      vlanSchema.safeParse({
        site_id: "11111111-1111-1111-1111-111111111111",
        vlan_id: 100,
        purpose: "guest wifi, password: hunter2",
      }).success,
    ).toBe(false);
  });

  it("still allows an ordinary vlan purpose", () => {
    expect(
      vlanSchema.safeParse({
        site_id: "11111111-1111-1111-1111-111111111111",
        vlan_id: 100,
        purpose: "Guest wifi",
      }).success,
    ).toBe(true);
  });
});

describe("createUserSchema", () => {
  const base = { email: "m@example.com", full_name: "Mgr", password: "hunter2hunter2" };

  it("accepts a name, email and password", () => {
    expect(createUserSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    expect(createUserSchema.safeParse({ ...base, password: "short7!" }).success).toBe(false);
  });

  // bcrypt truncates past 72 bytes, so a longer password would have its tail
  // silently ignored — reject it rather than store something the user can't
  // reproduce from what they typed.
  it("rejects a password over 72 characters", () => {
    expect(createUserSchema.safeParse({ ...base, password: "a".repeat(73) }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(createUserSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(createUserSchema.safeParse({ ...base, full_name: "   " }).success).toBe(false);
  });

  // Roles are gone (0006_drop_roles.sql) — a stale client sending role/country
  // must not have them silently persisted. Zod strips unknown keys by default,
  // so the parsed output carries exactly the three known fields.
  it("strips a role/country_code sent by a stale client", () => {
    const r = createUserSchema.safeParse({ ...base, role: "hq_admin", country_code: "MY" });
    expect(r.success).toBe(true);
    expect(r.success && Object.keys(r.data).sort()).toEqual(["email", "full_name", "password"]);
  });
});

describe("updateUserSchema", () => {
  const base = { email: "m@example.com", full_name: "Mgr" };

  it("accepts a name + email with no password", () => {
    const r = updateUserSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.password).toBeUndefined();
  });

  // A blank box means "keep the current password", so it must arrive as
  // undefined — an empty string would reach the admin API as a password reset.
  it("normalises an empty password to undefined", () => {
    const r = updateUserSchema.safeParse({ ...base, password: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.password).toBeUndefined();
  });

  it("accepts a replacement password", () => {
    const r = updateUserSchema.safeParse({ ...base, password: "hunter2hunter2" });
    expect(r.success && r.data.password).toBe("hunter2hunter2");
  });

  it("rejects a non-empty password under 8 characters", () => {
    expect(updateUserSchema.safeParse({ ...base, password: "short7!" }).success).toBe(false);
  });

  it("rejects a password over 72 characters (bcrypt truncates past 72 bytes)", () => {
    expect(updateUserSchema.safeParse({ ...base, password: "a".repeat(73) }).success).toBe(false);
  });

  it("rejects an invalid email and a blank name", () => {
    expect(updateUserSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, full_name: "   " }).success).toBe(false);
  });

  it("strips a role/country_code sent by a stale client", () => {
    const r = updateUserSchema.safeParse({ ...base, role: "hq_admin", country_code: "MY" });
    expect(r.success).toBe(true);
    expect(r.success && Object.keys(r.data).sort()).toEqual(["email", "full_name"]);
  });
});
