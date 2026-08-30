import { describe, expect, it, vi } from "vitest";
import {
  removeNeonAuthDirectoryUser,
  type NeonSql,
} from "./remove-neon-auth-user";

describe("removeNeonAuthDirectoryUser", () => {
  it("deletes sessions, accounts, sync, and the user row", async () => {
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join(" ").includes("SELECT id")) return [];
      return [];
    }) as unknown as NeonSql;

    await expect(
      removeNeonAuthDirectoryUser("user-1", { query }),
    ).resolves.toBe(true);

    const sql = (query as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => String(call[0]))
      .join("\n");
    expect(sql).toMatch(/session/);
    expect(sql).toMatch(/account/);
    expect(sql).toMatch(/users_sync/);
    expect(sql).toMatch(/"user"/);
  });

  it("treats a missing auth user as already closed", async () => {
    const query = vi.fn(async () => []) as unknown as NeonSql;
    await expect(
      removeNeonAuthDirectoryUser("user-1", { query }),
    ).resolves.toBe(true);
  });
});
