import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentDbRequestCost,
  emptyDbRequestCost,
  meteredNeonFetch,
  setDbRequestCostSlot,
  type DbRequestCost,
} from "./request-cost";

function slotFor(cost: DbRequestCost | undefined) {
  return { getStore: () => cost };
}

afterEach(() => {
  setDbRequestCostSlot(undefined);
  vi.unstubAllGlobals();
});

describe("meteredNeonFetch", () => {
  it("passes straight through when no request is metered", async () => {
    const original = new Response("{}");
    const fetchMock = vi.fn(async () => original);
    vi.stubGlobal("fetch", fetchMock);

    const res = await meteredNeonFetch("https://db.example/sql", {
      body: '{"query":"select 1"}',
    });

    expect(res).toBe(original);
    expect(currentDbRequestCost()).toBeUndefined();
  });

  it("counts round trips, statements and response bytes", async () => {
    const cost = emptyDbRequestCost();
    setDbRequestCostSlot(slotFor(cost));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"rows":[1,2,3]}', { status: 200 })),
    );

    const single = await meteredNeonFetch("https://db.example/sql", {
      body: '{"query":"select 1","params":[]}',
    });
    await meteredNeonFetch("https://db.example/sql", {
      body: JSON.stringify({
        queries: [{ query: "select 1" }, { query: "select 2" }],
      }),
    });

    expect(await single.json()).toEqual({ rows: [1, 2, 3] });
    expect(cost).toMatchObject({
      dbRoundTrips: 2,
      dbStatements: 3,
      dbBytes: 2 * '{"rows":[1,2,3]}'.length,
    });
    expect(cost.dbMs).toBeGreaterThanOrEqual(0);
  });

  it("keeps the Neon status and headers on the rebuilt response", async () => {
    setDbRequestCostSlot(slotFor(emptyDbRequestCost()));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"message":"bad"}', {
            status: 400,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const res = await meteredNeonFetch("https://db.example/sql", {
      body: "{}",
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toBe("application/json");
  });
});
