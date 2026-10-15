import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { processEditionFreezeQueue } = vi.hoisted(() => ({
  processEditionFreezeQueue: vi.fn(),
}));

vi.mock("@/lib/communities/edition-freeze", () => ({
  processEditionFreezeQueue,
}));

import { GET, POST } from "./route";

const URL_BASE = "https://thegamies.gg/api/cron/edition-freeze";

function req(init: { query?: string; authorization?: string } = {}) {
  const headers = new Headers();
  if (init.authorization) headers.set("authorization", init.authorization);
  return new Request(`${URL_BASE}${init.query ?? ""}`, {
    method: "POST",
    headers,
  });
}

describe("edition freeze cron route", () => {
  beforeEach(() => {
    processEditionFreezeQueue.mockReset();
    processEditionFreezeQueue.mockResolvedValue({ processed: 0 });
    vi.stubEnv("CRON_SECRET", "cron-s3cret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs with the Bearer secret", async () => {
    const res = await POST(req({ authorization: "Bearer cron-s3cret" }));
    expect(res.status).toBe(200);
    expect(processEditionFreezeQueue).toHaveBeenCalledOnce();
  });

  it("no longer accepts the secret in the URL", async () => {
    const res = await GET(
      new Request(`${URL_BASE}?secret=cron-s3cret`, { method: "GET" }),
    );
    expect(res.status).toBe(401);
    expect(processEditionFreezeQueue).not.toHaveBeenCalled();
  });

  it("rejects wrong, partial, and missing Bearer values", async () => {
    for (const authorization of [
      undefined,
      "Bearer ",
      "Bearer cron-s3cre",
      "Bearer cron-s3cret-extra",
      "cron-s3cret",
      "Basic cron-s3cret",
    ]) {
      const res = await POST(req({ authorization }));
      expect(res.status, String(authorization)).toBe(401);
    }
    expect(processEditionFreezeQueue).not.toHaveBeenCalled();
  });

  it("rejects everything when the secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "  ");
    const res = await POST(req({ authorization: "Bearer " }));
    expect(res.status).toBe(401);
    expect(processEditionFreezeQueue).not.toHaveBeenCalled();
  });
});
