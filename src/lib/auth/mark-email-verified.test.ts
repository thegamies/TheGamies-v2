import { describe, expect, it } from "vitest";
import { markAuthEmailVerified } from "./mark-email-verified";
import type { NeonSql } from "./neon-sql";

function mockQuery(handler: (sql: string, values: unknown[]) => unknown): NeonSql {
  return ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
      "",
    );
    return Promise.resolve(handler(sql, values));
  }) as NeonSql;
}

describe("markAuthEmailVerified", () => {
  it("updates auth_user by id", async () => {
    const calls: string[] = [];
    const query = mockQuery((sql) => {
      calls.push(sql);
      if (sql.includes("SELECT")) return [{ id: "user-1" }];
      return [];
    });
    await expect(
      markAuthEmailVerified({ authUserId: "user-1", query }),
    ).resolves.toBe(true);
    expect(calls[0]).toMatch(/UPDATE auth_user/);
    expect(calls[0]).not.toMatch(/neon_auth/);
  });

  it("updates auth_user by email", async () => {
    const calls: string[] = [];
    const query = mockQuery((sql) => {
      calls.push(sql);
      if (sql.includes("SELECT")) return [{ id: "user-1" }];
      return [];
    });
    await expect(
      markAuthEmailVerified({ email: "a@b.c", query }),
    ).resolves.toBe(true);
    expect(calls.some((sql) => /auth_user/.test(sql))).toBe(true);
    expect(calls.every((sql) => !/neon_auth/.test(sql))).toBe(true);
  });

  it("returns false without id or email", async () => {
    await expect(markAuthEmailVerified({})).resolves.toBe(false);
  });
});
