import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentDbRequestCost,
  meteredNeonFetch,
  setDbRequestCostSlot,
} from "@thegamies/db/request-cost";
import {
  classifyRequest,
  REQUEST_COST_JOURNEY_HEADER,
  REQUEST_COST_STEP_HEADER,
  withRequestCost,
  type RequestCostRecord,
} from "./request-cost";

const ON = { REQUEST_COST_METER: "1" };

afterEach(() => {
  setDbRequestCostSlot(undefined);
  vi.unstubAllGlobals();
});

function parse(line: string): RequestCostRecord {
  return JSON.parse(line) as RequestCostRecord;
}

describe("classifyRequest", () => {
  it.each([
    [new Request("https://x.test/_next/image?url=a&w=96"), "image"],
    [
      new Request("https://x.test/communities/a", {
        method: "POST",
        headers: { "next-action": "abc" },
      }),
      "action",
    ],
    [new Request("https://x.test/games", { headers: { rsc: "1" } }), "rsc"],
    [new Request("https://x.test/api/communities/a/edition/2025/standings"), "api"],
    [
      new Request("https://x.test/games", { headers: { accept: "text/html" } }),
      "document",
    ],
    [new Request("https://x.test/robots.txt"), "other"],
  ] as const)("%s → %s", (request, kind) => {
    expect(classifyRequest(request)).toBe(kind);
  });
});

describe("withRequestCost", () => {
  it("returns the handler response untouched when metering is off", async () => {
    const original = new Response("hi");
    const log = vi.fn();
    const wrapped = withRequestCost(async () => original, log);

    const res = await wrapped(new Request("https://x.test/"), {}, {});

    expect(res).toBe(original);
    expect(log).not.toHaveBeenCalled();
  });

  it("logs one line after the body finishes, with DB work done while streaming", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"rows":[]}')),
    );
    const log = vi.fn();
    const wrapped = withRequestCost(async () => {
      await meteredNeonFetch("https://db.test/sql", { body: "{}" });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          // A query issued mid-stream still belongs to this request.
          await meteredNeonFetch("https://db.test/sql", { body: "{}" });
          controller.enqueue(encoder.encode("hello "));
          controller.enqueue(encoder.encode("world"));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    }, log);

    const res = await wrapped(
      new Request("https://x.test/communities/a/edition/2025?view=standings", {
        headers: {
          accept: "text/html",
          [REQUEST_COST_JOURNEY_HEADER]: "run-1",
          [REQUEST_COST_STEP_HEADER]: "standings",
        },
      }),
      ON,
      {},
    );

    expect(log).not.toHaveBeenCalled();
    expect(await res.text()).toBe("hello world");
    expect(log).toHaveBeenCalledTimes(1);
    expect(parse(log.mock.calls[0][0])).toMatchObject({
      type: "request_cost",
      journey: "run-1",
      step: "standings",
      kind: "document",
      method: "GET",
      path: "/communities/a/edition/2025?view=standings",
      status: 200,
      responseBytes: 11,
      dbRoundTrips: 2,
      dbStatements: 2,
      dbBytes: 2 * '{"rows":[]}'.length,
    });
  });

  it("logs immediately for responses without a body", async () => {
    const log = vi.fn();
    const wrapped = withRequestCost(
      async () => new Response(null, { status: 304 }),
      log,
    );

    await wrapped(new Request("https://x.test/"), ON, {});

    expect(parse(log.mock.calls[0][0])).toMatchObject({
      status: 304,
      responseBytes: 0,
      journey: null,
    });
  });

  it("keeps concurrent requests' DB counters separate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
    const log = vi.fn();
    const wrapped = withRequestCost(async (request: Request) => {
      const n = Number(new URL(request.url).searchParams.get("n"));
      for (let i = 0; i < n; i++) {
        await meteredNeonFetch("https://db.test/sql", { body: "{}" });
      }
      return new Response(null);
    }, log);

    await Promise.all([
      wrapped(new Request("https://x.test/?n=1"), ON, {}),
      wrapped(new Request("https://x.test/?n=3"), ON, {}),
    ]);

    const byPath = Object.fromEntries(
      log.mock.calls.map(([line]) => {
        const r = parse(line);
        return [r.path, r.dbRoundTrips];
      }),
    );
    expect(byPath).toEqual({ "/?n=1": 1, "/?n=3": 3 });
    expect(currentDbRequestCost()).toBeUndefined();
  });
});
