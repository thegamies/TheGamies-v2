import { afterEach, describe, expect, it, vi } from "vitest";
import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
  workersDefaultCache,
} from "./workers-cache";

describe("workers cache json", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("misses when caches.default is absent", async () => {
    vi.stubGlobal("caches", undefined);
    expect(workersDefaultCache()).toBeNull();
    expect(await matchWorkersCacheJson(new Request("https://x.internal/a"))).toBe(
      null,
    );
  });

  it("round-trips json through a fake Cache", async () => {
    const store = new Map<string, Response>();
    const cache = {
      match: async (request: Request) => store.get(request.url) ?? undefined,
      put: async (request: Request, response: Response) => {
        store.set(request.url, response);
      },
    };
    vi.stubGlobal("caches", { default: cache });

    const key = new Request("https://thegamies.internal/cache/t");
    await putWorkersCacheJson(key, { n: 3 }, 60);
    await expect(matchWorkersCacheJson<{ n: number }>(key)).resolves.toEqual({
      n: 3,
    });
  });
});
