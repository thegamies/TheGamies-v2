import { afterEach, describe, expect, it, vi } from "vitest";
import { readSelfHostedAuthEnv, useSelfHostedAuth } from "./self-hosted-env";

describe("self-hosted auth env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off without a long secret", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    vi.stubEnv("DATABASE_URL", "postgres://example");
    expect(useSelfHostedAuth()).toBe(false);
    expect(readSelfHostedAuthEnv()).toBeNull();
  });

  it("is on with secret and database", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.example");
    expect(useSelfHostedAuth()).toBe(true);
    expect(readSelfHostedAuthEnv()).toEqual({
      secret: "x".repeat(32),
      baseURL: "https://preview.example",
      databaseUrl: "postgres://example",
    });
  });
});
