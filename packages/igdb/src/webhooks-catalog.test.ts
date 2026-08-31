import { describe, expect, it } from "vitest";
import { formatIgdbWebhookSecret } from "./webhook-routing";
import type { IgdbWebhookRegistration } from "./webhooks-api";
import {
  normalizeWebhookRegistrations,
  webhookCallbackUrlsMatch,
} from "./webhooks-catalog";

const STAGE_CB =
  "https://thegamies-igdb-webhooks-develop.ecdm981.workers.dev/igdb";
const PROD_CB = "https://thegamies-igdb-webhooks.ecdm981.workers.dev/igdb";
const STAGE_BASE = "stage-base";
const PROD_BASE = "prod-base";

function registration(
  overrides: Partial<IgdbWebhookRegistration>,
): IgdbWebhookRegistration {
  return {
    id: 1,
    url: STAGE_CB,
    category: 0,
    sub_category: 0,
    active: true,
    api_key: "key",
    secret: formatIgdbWebhookSecret(STAGE_BASE, "games", "create"),
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("webhookCallbackUrlsMatch", () => {
  it("treats trailing slashes as the same callback", () => {
    expect(webhookCallbackUrlsMatch(STAGE_CB, `${STAGE_CB}/`)).toBe(true);
    expect(webhookCallbackUrlsMatch(STAGE_CB, PROD_CB)).toBe(false);
  });
});

describe("normalizeWebhookRegistrations", () => {
  it("keeps this environment’s slots and ignores the other environment", () => {
    const overview = normalizeWebhookRegistrations(
      [
        registration({ id: 11 }),
        registration({
          id: 22,
          url: PROD_CB,
          secret: formatIgdbWebhookSecret(PROD_BASE, "games", "create"),
        }),
        registration({
          id: 33,
          url: PROD_CB,
          secret: formatIgdbWebhookSecret(PROD_BASE, "covers", "update"),
        }),
      ],
      STAGE_BASE,
      STAGE_CB,
    );

    const gamesCreate = overview.slots.find(
      (row) => row.entity === "games" && row.method === "create",
    );
    const coversUpdate = overview.slots.find(
      (row) => row.entity === "covers" && row.method === "update",
    );

    expect(gamesCreate?.status).toBe("active");
    expect(gamesCreate?.igdbWebhookId).toBe(11);
    expect(coversUpdate?.status).toBe("not_registered");
    expect(overview.orphans).toEqual([]);
  });

  it("does not treat the other environment as unrecognized when bases differ", () => {
    const overview = normalizeWebhookRegistrations(
      [
        registration({
          id: 22,
          url: PROD_CB,
          secret: formatIgdbWebhookSecret(PROD_BASE, "games", "create"),
        }),
      ],
      STAGE_BASE,
      STAGE_CB,
    );

    expect(
      overview.slots.every((row) => row.status === "not_registered"),
    ).toBe(true);
    expect(overview.orphans).toEqual([]);
  });

  it("ignores the other callback even when the base secret is shared", () => {
    const overview = normalizeWebhookRegistrations(
      [
        registration({ id: 11 }),
        registration({
          id: 22,
          url: PROD_CB,
          secret: formatIgdbWebhookSecret(STAGE_BASE, "games", "create"),
        }),
      ],
      STAGE_BASE,
      STAGE_CB,
    );

    const gamesCreate = overview.slots.find(
      (row) => row.entity === "games" && row.method === "create",
    );
    expect(gamesCreate?.igdbWebhookId).toBe(11);
    expect(overview.orphans).toEqual([]);
  });

  it("still flags a bad secret on this environment’s callback", () => {
    const overview = normalizeWebhookRegistrations(
      [registration({ id: 9, secret: "not-this-env" })],
      STAGE_BASE,
      STAGE_CB,
    );

    expect(overview.orphans).toEqual([
      expect.objectContaining({
        id: 9,
        url: STAGE_CB,
      }),
    ]);
  });
});
