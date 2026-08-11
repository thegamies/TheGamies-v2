import { describe, expect, it } from "vitest";
import {
  isValidUsername,
  normalizeUsername,
  usernameSchema,
} from "./username";
import { ownsProfile } from "./ownership";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("username", () => {
  it("normalizes case and trim", () => {
    expect(normalizeUsername("  Foo_Bar  ")).toBe("foo_bar");
  });

  it("accepts valid usernames", () => {
    expect(isValidUsername("ada")).toBe(true);
    expect(isValidUsername("player_one")).toBe(true);
    expect(usernameSchema.parse("Ada_99")).toBe("ada_99");
  });

  it("rejects invalid usernames", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("has-dash")).toBe(false);
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("a".repeat(25))).toBe(false);
  });
});

describe("ownsProfile", () => {
  const profile = { authUserId: "auth-1" };

  it("is true only for matching auth user", () => {
    expect(ownsProfile(profile, "auth-1")).toBe(true);
    expect(ownsProfile(profile, "other")).toBe(false);
    expect(ownsProfile(profile, null)).toBe(false);
    expect(ownsProfile(profile, undefined)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("allows relative paths only", () => {
    expect(safeNextPath("/l/abc")).toBe("/l/abc");
    expect(safeNextPath("//evil")).toBeNull();
    expect(safeNextPath("https://evil")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
