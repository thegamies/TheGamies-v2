import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/l/abc")).toBe("/l/abc");
    expect(safeNextPath("/create/goty?year=2026&intent=save")).toBe(
      "/create/goty?year=2026&intent=save",
    );
    expect(safeNextPath("/auth/confirmed?next=%2Fcreate%2Fgoty")).toBe(
      "/auth/confirmed?next=%2Fcreate%2Fgoty",
    );
    expect(safeNextPath("/games?q=zelda%20breath")).toBe(
      "/games?q=zelda%20breath",
    );
    expect(safeNextPath("  /account  ")).toBe("/account");
  });

  it("rejects empty and absolute values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("account")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative and backslash paths", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("/\\/evil.com")).toBeNull();
    expect(safeNextPath("/a\\b")).toBeNull();
  });

  it("rejects control characters browsers strip", () => {
    expect(safeNextPath("/\t/evil.com")).toBeNull();
    expect(safeNextPath("/\n/evil.com")).toBeNull();
    expect(safeNextPath("/\r/evil.com")).toBeNull();
    expect(safeNextPath("/\u0000/evil.com")).toBeNull();
  });

  it("rejects encoded tricks", () => {
    expect(safeNextPath("/%2F%2Fevil.com")).toBeNull();
    expect(safeNextPath("/%2Fevil.com")).toBeNull();
    expect(safeNextPath("/%5Cevil.com")).toBeNull();
    expect(safeNextPath("/%09/evil.com")).toBeNull();
    expect(safeNextPath("/x?u=https%3A%2F%2Fevil.com")).toBeNull();
    expect(safeNextPath("/100%")).toBeNull();
  });
});
