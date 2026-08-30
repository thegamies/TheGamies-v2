import { describe, expect, it } from "vitest";
import { verifyNeonAuthWebhook } from "./neon-webhook";

describe("verifyNeonAuthWebhook", () => {
  it("rejects missing signature headers", async () => {
    await expect(
      verifyNeonAuthWebhook({
        rawBody: "{}",
        signature: null,
        kid: null,
        timestamp: null,
        jwksUrl: "https://example.com/jwks.json",
      }),
    ).rejects.toThrow("missing-headers");
  });
});
