import { describe, expect, it } from "vitest";
import {
  formatIgdbWebhookSecret,
  inferWebhookEntityFromPayload,
  resolveWebhookRouting,
  verifyIgdbWebhookSecret,
} from "./webhook-routing";
import { assertIgdbGame, assertIgdbCover } from "./webhook-apply-parsers";
import {
  clampDrainSettings,
  shouldRunDrain,
} from "./webhook-settings";
import { timingSafeEqualString } from "./timing-safe";

describe("timingSafeEqualString", () => {
  it("matches equal secrets", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
    expect(timingSafeEqualString("abc", "ab")).toBe(false);
  });
});

describe("webhook routing", () => {
  const base = "base-secret";

  it("verifies typed and base secrets", () => {
    expect(verifyIgdbWebhookSecret(base, base)).toBe(true);
    expect(
      verifyIgdbWebhookSecret(formatIgdbWebhookSecret(base, "games", "create"), base),
    ).toBe(true);
    expect(verifyIgdbWebhookSecret("wrong", base)).toBe(false);
  });

  it("routes from typed secret first", () => {
    const routed = resolveWebhookRouting({
      receivedSecret: formatIgdbWebhookSecret(base, "covers", "update"),
      baseSecret: base,
      endpointHeader: "games",
      operationHeader: "create",
      payload: { id: 1, name: "X" },
    });
    expect(routed).toEqual({ entity: "covers", method: "update" });
  });

  it("infers cover entity from payload", () => {
    expect(inferWebhookEntityFromPayload({ id: 1, image_id: "abc" })).toBe(
      "covers",
    );
  });
});

describe("webhook parsers", () => {
  it("parses game and cover payloads", () => {
    expect(
      assertIgdbGame({
        id: 10,
        name: "Test",
        platforms: [1, 2],
        total_rating: 80.2,
      }),
    ).toMatchObject({
      id: 10,
      name: "Test",
      platforms: [1, 2],
      total_rating: 80.2,
    });
    expect(
      assertIgdbCover({ id: 3, image_id: "img", width: 100, height: 200 }),
    ).toMatchObject({ id: 3, image_id: "img", width: 100, height: 200 });
  });
});

describe("drain settings", () => {
  it("clamps interval and batch size", () => {
    expect(
      clampDrainSettings({
        intervalMinutes: 0,
        maxMessagesPerDrain: 500,
        paused: true,
      }),
    ).toEqual({
      processingMode: "queued",
      intervalMinutes: 1,
      maxMessagesPerDrain: 100,
      paused: true,
      lastDrainAt: null,
    });
  });

  it("accepts live processing mode", () => {
    expect(clampDrainSettings({ processingMode: "live" }).processingMode).toBe(
      "live",
    );
    expect(
      shouldRunDrain(
        clampDrainSettings({
          processingMode: "live",
          paused: false,
          lastDrainAt: null,
        }),
      ),
    ).toBe(false);
  });

  it("honors interval before next drain", () => {
    const settings = clampDrainSettings({
      intervalMinutes: 15,
      maxMessagesPerDrain: 10,
      paused: false,
      lastDrainAt: "2026-08-20T12:00:00.000Z",
    });
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:10:00.000Z")),
    ).toBe(false);
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:15:00.000Z")),
    ).toBe(true);
    expect(
      shouldRunDrain({ ...settings, paused: true }, new Date("2026-08-20T13:00:00.000Z")),
    ).toBe(false);
  });
});
