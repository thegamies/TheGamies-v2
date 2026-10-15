import { beforeEach, describe, expect, it, vi } from "vitest";

const { proxyWebhooksWorker } = vi.hoisted(() => ({
  proxyWebhooksWorker: vi.fn(),
}));

vi.mock("@/lib/admin-webhooks-proxy", () => ({ proxyWebhooksWorker }));

import { DELETE } from "./register/route";
import { POST as reprocess } from "./events/[id]/reprocess/route";

const EVENT_ID = "3f2b8c1e-9a4d-4b6f-8e2a-1c5d7f9b0a12";

beforeEach(() => {
  proxyWebhooksWorker.mockReset();
  proxyWebhooksWorker.mockResolvedValue(Response.json({ ok: true }));
});

describe("admin webhook proxy ids", () => {
  it("forwards a numeric webhook id", async () => {
    const res = await DELETE(
      new Request("https://thegamies.gg/api/admin/webhooks/register?webhookId=42", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    expect(proxyWebhooksWorker).toHaveBeenCalledWith(
      expect.any(Request),
      "/admin/register/42",
      { method: "DELETE" },
    );
  });

  it("refuses webhook ids that could change the worker path", async () => {
    for (const id of ["", "1/../../internal/drain", "42?x=1", "1e3", "-1", "abc"]) {
      const res = await DELETE(
        new Request(
          `https://thegamies.gg/api/admin/webhooks/register?webhookId=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        ),
      );
      expect(res.status, id).toBe(400);
    }
    expect(proxyWebhooksWorker).not.toHaveBeenCalled();
  });

  it("forwards a uuid event id", async () => {
    const res = await reprocess(
      new Request("https://thegamies.gg/api/admin/webhooks/events/x/reprocess", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: EVENT_ID }) },
    );
    expect(res.status).toBe(200);
    expect(proxyWebhooksWorker).toHaveBeenCalledWith(
      expect.any(Request),
      `/admin/events/${EVENT_ID}/reprocess`,
      { method: "POST" },
    );
  });

  it("refuses non-uuid event ids", async () => {
    for (const id of ["..%2F..%2Finternal%2Fdrain", "../settings", "123", `${EVENT_ID}/x`]) {
      const res = await reprocess(
        new Request("https://thegamies.gg/api/admin/webhooks/events/x/reprocess", {
          method: "POST",
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(res.status, id).toBe(400);
    }
    expect(proxyWebhooksWorker).not.toHaveBeenCalled();
  });
});
