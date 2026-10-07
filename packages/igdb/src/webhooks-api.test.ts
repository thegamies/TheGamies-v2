import { describe, expect, it } from "vitest";
import { toPublicWebhookRegistration } from "./webhooks-api";

describe("toPublicWebhookRegistration", () => {
  it("drops secret and api_key", () => {
    const pub = toPublicWebhookRegistration({
      id: 7,
      url: "https://hooks.example/igdb",
      category: 1,
      sub_category: 0,
      active: true,
      api_key: "igdb-api-key",
      secret: "base-secret:games:update",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });
    expect(pub).toEqual({
      id: 7,
      url: "https://hooks.example/igdb",
      active: true,
    });
    expect(JSON.stringify(pub)).not.toContain("base-secret");
    expect(JSON.stringify(pub)).not.toContain("igdb-api-key");
  });
});
