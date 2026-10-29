import { describe, expect, it, vi } from "vitest";
import { removeSelfHostedAuthUser } from "./remove-self-hosted-auth-user";
import type { NeonSql } from "./neon-sql";

describe("removeSelfHostedAuthUser", () => {
  it("deletes auth_* rows and reports the user gone", async () => {
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join(" ").includes("SELECT id")) return [];
      return [];
    }) as unknown as NeonSql;

    await expect(
      removeSelfHostedAuthUser("user-1", { query, email: "a@b.c" }),
    ).resolves.toBe(true);

    const sql = (query as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => String(call[0]))
      .join("\n");
    expect(sql).toMatch(/auth_session/);
    expect(sql).toMatch(/auth_account/);
    expect(sql).toMatch(/auth_verification/);
    expect(sql).toMatch(/auth_user/);
  });

  it("is false for a blank id", async () => {
    await expect(removeSelfHostedAuthUser("")).resolves.toBe(false);
  });
});
