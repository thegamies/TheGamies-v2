import { describe, expect, it, vi } from "vitest";
import { markNeonAuthEmailVerified } from "./mark-email-verified";
import type { NeonSql } from "./remove-neon-auth-user";

describe("markNeonAuthEmailVerified", () => {
  it("updates neon_auth.user by id", async () => {
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

  it("is false when id and email are missing", async () => {
    await expect(markNeonAuthEmailVerified({})).resolves.toBe(false);
  });
});
