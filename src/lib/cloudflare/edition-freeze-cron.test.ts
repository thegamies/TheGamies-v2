import { describe, expect, it, vi } from "vitest";
import {
  EDITION_FREEZE_CRON_PATH,
  editionFreezeCronRequest,
  editionFreezeCronSecret,
  runEditionFreezeCron,
} from "./edition-freeze-cron";

describe("editionFreezeCronSecret", () => {
  it("returns null when unset or blank", () => {
    expect(editionFreezeCronSecret({})).toBeNull();
    expect(editionFreezeCronSecret({ CRON_SECRET: "  " })).toBeNull();
  });

  it("trims a present secret", () => {
    expect(editionFreezeCronSecret({ CRON_SECRET: "  abc  " })).toBe("abc");
  });
});

describe("editionFreezeCronRequest", () => {
  it("POSTs the freeze route with Bearer auth", () => {
    const request = editionFreezeCronRequest("s3cret");
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe(EDITION_FREEZE_CRON_PATH);
    expect(request.headers.get("authorization")).toBe("Bearer s3cret");
  });
});

describe("runEditionFreezeCron", () => {
  it("skips when secret is missing", async () => {
    const fetch = vi.fn();
    await expect(
      runEditionFreezeCron({ WORKER_SELF_REFERENCE: { fetch } }),
    ).resolves.toBe("skipped");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("skips when the self-reference binding is missing", async () => {
    await expect(
      runEditionFreezeCron({ CRON_SECRET: "s3cret" }),
    ).resolves.toBe("skipped");
  });

  it("fetches the freeze route and returns ok", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await expect(
      runEditionFreezeCron({
        CRON_SECRET: "s3cret",
        WORKER_SELF_REFERENCE: { fetch },
      }),
    ).resolves.toBe("ok");
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.headers.get("authorization")).toBe("Bearer s3cret");
  });

  it("throws when the freeze route is not ok", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    await expect(
      runEditionFreezeCron({
        CRON_SECRET: "s3cret",
        WORKER_SELF_REFERENCE: { fetch },
      }),
    ).rejects.toThrow(/failed \(500\)/);
  });
});
