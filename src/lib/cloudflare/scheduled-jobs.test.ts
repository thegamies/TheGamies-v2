import { describe, expect, it, vi } from "vitest";
import { runCloudflareScheduledJobs } from "./scheduled-jobs";

describe("runCloudflareScheduledJobs", () => {
  it("returns paused without hitting freeze", async () => {
    const fetch = vi.fn();
    const get = vi.fn().mockResolvedValue({ paused: true });
    await expect(
      runCloudflareScheduledJobs({
        CRON_SECRET: "s3cret",
        WORKER_SELF_REFERENCE: { fetch },
        CRON_SETTINGS: { get, put: vi.fn() },
      }),
    ).resolves.toBe("paused");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("runs freeze when not paused", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await expect(
      runCloudflareScheduledJobs({
        CRON_SECRET: "s3cret",
        WORKER_SELF_REFERENCE: { fetch },
        CRON_SETTINGS: {
          get: vi.fn().mockResolvedValue({ paused: false }),
          put: vi.fn(),
        },
      }),
    ).resolves.toBe("ok");
    expect(fetch).toHaveBeenCalledOnce();
  });
});
