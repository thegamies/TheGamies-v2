import { describe, expect, it } from "vitest";
import { skipEmailVerification } from "./skip-email-verification";

describe("skipEmailVerification", () => {
  it("is on for local next dev", () => {
    expect(skipEmailVerification({ NODE_ENV: "development" })).toBe(true);
  });

  it("stays off on hosted deploys", () => {
    expect(skipEmailVerification({ NODE_ENV: "production" })).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        VERCEL: "1",
      }),
    ).toBe(false);
    expect(skipEmailVerification({ NODE_ENV: "test" })).toBe(false);
  });
});
