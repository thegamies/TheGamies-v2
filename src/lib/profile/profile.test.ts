import { describe, expect, it } from "vitest";
import {
  USERNAME_CHANGE_COOLDOWN_MS,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_NOT_AVAILABLE,
  canChangeUsername,
  isReservedUsername,
  isValidUsername,
  nextUsernameChangeAllowedAt,
  normalizeUsername,
  parseOwnedUsername,
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

  it("blocks reserved handles", () => {
    expect(isReservedUsername("Admin")).toBe(true);
    expect(isReservedUsername("communities")).toBe(true);
    expect(parseOwnedUsername("auth")).toEqual({
      error: USERNAME_NOT_AVAILABLE,
    });
    expect(parseOwnedUsername("ok")).toEqual({
      error: USERNAME_FORMAT_MESSAGE,
    });
    expect(parseOwnedUsername("Ada_99")).toEqual({ username: "ada_99" });
  });

  it("allows a rename when cooldown is null or elapsed", () => {
    const now = new Date("2026-08-19T12:00:00Z");
    expect(canChangeUsername(null, now)).toBe(true);
    expect(
      canChangeUsername(new Date("2026-07-01T12:00:00Z"), now),
    ).toBe(true);
    expect(
      nextUsernameChangeAllowedAt(new Date("2026-07-21T12:00:00Z"), now),
    ).toEqual(new Date("2026-08-20T12:00:00Z"));
    expect(
      canChangeUsername(new Date(now.getTime() - USERNAME_CHANGE_COOLDOWN_MS + 1), now),
    ).toBe(false);
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
