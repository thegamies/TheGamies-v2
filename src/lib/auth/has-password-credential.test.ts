import { afterEach, describe, expect, it, vi } from "vitest";
import { hasPasswordCredential } from "./has-password-credential";
import type { NeonSql } from "./remove-neon-auth-user";

describe("hasPasswordCredential", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true when Auth has a credential account", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const query = vi.fn(async () => [{ "?column?": 1 }]) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      true,
    );
  });

  it("is false when the only account is Google", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const query = vi.fn(async () => []) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      false,
    );
  });

  it("reads auth_account when self-hosted", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://example");
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      expect(strings.join(" ")).toMatch(/auth_account/);
      return [{ "?column?": 1 }];
    }) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      true,
    );
  });

  it("fails open when the Auth account table is missing", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const query = vi.fn(async () => {
      throw new Error('relation "neon_auth.account" does not exist');
    }) as unknown as NeonSql;
    await expect(hasPasswordCredential("user-1", { query })).resolves.toBe(
      true,
    );
  });
});

