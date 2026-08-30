import { describe, expect, it } from "vitest";
import { skipEmailVerification } from "./skip-email-verification";

describe("skipEmailVerification", () => {
  it("is on for local next dev", () => {
    expect(skipEmailVerification({ NODE_ENV: "development" })).toBe(true);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toBe(true);
  });

  it("stays off on pull-request previews and other hosted deploys", () => {
    expect(skipEmailVerification({ NODE_ENV: "production" })).toBe(false);
    expect(skipEmailVerification({ NODE_ENV: "test" })).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        CF_PAGES: "1",
      }),
    ).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL:
          "https://thegamies-v2-pr-12.example.workers.dev",
      }),
    ).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL:
          "https://thegamies-v2-develop.example.workers.dev",
      }),
    ).toBe(false);
    expect(
      skipEmailVerification({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "https://thegamies.gg",
      }),
    ).toBe(false);
  });
});
