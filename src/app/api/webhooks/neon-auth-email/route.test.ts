import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyNeonAuthWebhook, sendAuthEmail } = vi.hoisted(() => ({
  verifyNeonAuthWebhook: vi.fn(),
  sendAuthEmail: vi.fn(),
}));

vi.mock("@/lib/email/neon-webhook", () => ({
  neonAuthJwksUrl: () => "https://auth.example/jwks",
  verifyNeonAuthWebhook,
}));

vi.mock("@/lib/email/send", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/send")>()),
  sendAuthEmail,
}));

import { POST } from "./route";

function verificationPayload(email: string) {
  return {
    event_type: "send.magic_link",
    user: { email },
    event_data: {
      link_type: "email-verification",
      link_url: "https://auth.example/verify?token=abc",
    },
  };
}

function post() {
  return POST(
    new Request("https://thegamies.gg/api/webhooks/neon-auth-email", {
      method: "POST",
      body: "{}",
    }),
  );
}

describe("POST /api/webhooks/neon-auth-email", () => {
  beforeEach(() => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example");
    verifyNeonAuthWebhook.mockReset();
    sendAuthEmail.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never sends mail to undeliverable QA addresses", async () => {
    verifyNeonAuthWebhook.mockResolvedValueOnce(
      verificationPayload("thegamies-qa-host@example.com"),
    );
    const response = await post();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, skipped: true });
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it("still sends verification mail to real addresses", async () => {
    verifyNeonAuthWebhook.mockResolvedValueOnce(
      verificationPayload("ada@gmail.com"),
    );
    sendAuthEmail.mockResolvedValueOnce(undefined);
    const response = await post();
    expect(response.status).toBe(200);
    expect(sendAuthEmail).toHaveBeenCalledTimes(1);
    expect(sendAuthEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "ada@gmail.com",
    });
  });
});
