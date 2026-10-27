import { afterEach, describe, expect, it, vi } from "vitest";
import { markNeonAuthEmailVerified } from "./mark-email-verified";
import type { NeonSql } from "./remove-neon-auth-user";

describe("markNeonAuthEmailVerified", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("updates neon_auth.user by id", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join(" ").includes("SELECT id")) return [{ id: "user-1" }];
      return [];
    }) as unknown as NeonSql;

    await expect(
      markNeonAuthEmailVerified({ authUserId: "user-1", query }),
    ).resolves.toBe(true);

    const sql = (query as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => String(call[0]))
      .join("\n");
    expect(sql).toMatch(/emailVerified/);
    expect(sql).toMatch(/"user"/);
  });

  it("updates auth_user when self-hosted", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://example");
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join(" ").includes("SELECT id")) return [{ id: "user-1" }];
      return [];
    }) as unknown as NeonSql;

    await expect(
      markNeonAuthEmailVerified({ authUserId: "user-1", query }),
    ).resolves.toBe(true);

    const sql = (query as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => String(call[0]))
      .join("\n");
    expect(sql).toMatch(/auth_user/);
    expect(sql).not.toMatch(/neon_auth/);
  });

  it("is false when id and email are missing", async () => {
    await expect(markNeonAuthEmailVerified({})).resolves.toBe(false);
  });
});
