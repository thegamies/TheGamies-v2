/**
 * Per-request database cost counters for the Neon HTTP driver.
 *
 * The store lives on `globalThis` under a registered symbol because the
 * Worker entry and the OpenNext server bundle each carry their own copy of
 * this module; a module-level variable would not be shared between them.
 */
export type DbRequestCost = {
  /** HTTP requests to Neon (a `db.batch` is one). */
  dbRoundTrips: number;
  /** SQL statements sent (each statement in a batch counts). */
  dbStatements: number;
  /** Decoded response bytes from Neon. Upper bound on billed transfer. */
  dbBytes: number;
  /** Wall time spent waiting on Neon, summed across round trips. */
  dbMs: number;
};

export type DbRequestCostSlot = {
  getStore(): DbRequestCost | undefined;
};

const SLOT_KEY = Symbol.for("thegamies.requestCost");

type GlobalWithSlot = typeof globalThis & {
  [SLOT_KEY]?: DbRequestCostSlot;
};

export function emptyDbRequestCost(): DbRequestCost {
  return { dbRoundTrips: 0, dbStatements: 0, dbBytes: 0, dbMs: 0 };
}

export function setDbRequestCostSlot(slot: DbRequestCostSlot | undefined) {
  (globalThis as GlobalWithSlot)[SLOT_KEY] = slot;
}

export function currentDbRequestCost(): DbRequestCost | undefined {
  return (globalThis as GlobalWithSlot)[SLOT_KEY]?.getStore();
}

function countStatements(body: unknown): number {
  if (typeof body !== "string" || !body.startsWith('{"queries":')) return 1;
  try {
    const parsed = JSON.parse(body) as { queries?: unknown[] };
    return Array.isArray(parsed.queries) ? parsed.queries.length : 1;
  } catch {
    return 1;
  }
}

/** `neonConfig.fetchFunction`: plain `fetch` unless the current request is metered. */
export async function meteredNeonFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const cost = currentDbRequestCost();
  if (!cost) return fetch(input, init);

  const started = Date.now();
  const res = await fetch(input, init);
  const body = await res.arrayBuffer();
  cost.dbRoundTrips += 1;
  cost.dbStatements += countStatements(init?.body);
  cost.dbBytes += body.byteLength;
  cost.dbMs += Date.now() - started;
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
