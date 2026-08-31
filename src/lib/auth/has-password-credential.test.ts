import { describe, expect, it, vi } from "vitest";
import { hasPasswordCredential } from "./has-password-credential";
import type { NeonSql } from "./remove-neon-auth-user";

describe("hasPasswordCredential", () => {
  it("is true when Auth has a credential account", async () => {
    const query = vi.fn(async () => [{ "?column?": 1 }]) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      true,
    );
  });

  it("is false when the only account is Google", async () => {
    const query = vi.fn(async () => []) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      false,
    );
  });

  it("fails open when the Auth account table is missing", async () => {
    const query = vi.fn(async () => {
      throw new Error('relation "neon_auth.account" does not exist');
    }) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      true,
    );
  });
});
