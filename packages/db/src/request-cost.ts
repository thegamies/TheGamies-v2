/**
 * Per-request database cost counters for the Neon HTTP driver.
 *
 * The store lives on `globalThis` under a registered symbol because the
 * Worker entry and the OpenNext server bundle each carry their own copy of
 * this module; a module-level variable would not be shared between them.
 */
export type DbCostTrip = {
  startMs: number;
  endMs: number;
  ms: number;
  statements: number;
  /** Whitespace-collapsed SQL; no bind params. */
  sql: string;
  bytes: number;
};

export type DbRequestCost = {
  /** HTTP requests to Neon (a `db.batch` is one). */
  dbRoundTrips: number;
  /** SQL statements sent (each statement in a batch counts). */
  dbStatements: number;
  /** Decoded response bytes from Neon. Upper bound on billed transfer. */
  dbBytes: number;
  /** Sum of each trip’s wait (parallel trips add). Work, not a clock. */
  dbMs: number;
  trips: DbCostTrip[];
};

export type DbRequestCostSlot = {
  getStore(): DbRequestCost | undefined;
};

const SLOT_KEY = Symbol.for("thegamies.requestCost");
const SQL_FINGERPRINT_MAX = 160;
const TRIP_HEADER_MAX = 7000;

type GlobalWithSlot = typeof globalThis & {
  [SLOT_KEY]?: DbRequestCostSlot;
};

export function emptyDbRequestCost(): DbRequestCost {
  return {
    dbRoundTrips: 0,
    dbStatements: 0,
    dbBytes: 0,
    dbMs: 0,
    trips: [],
  };
}

export function setDbRequestCostSlot(slot: DbRequestCostSlot | undefined) {
  (globalThis as GlobalWithSlot)[SLOT_KEY] = slot;
}

export function currentDbRequestCost(): DbRequestCost | undefined {
  return (globalThis as GlobalWithSlot)[SLOT_KEY]?.getStore();
}

export function fingerprintNeonSql(sql: string): string {
  const collapsed = sql.replace(/\s+/g, " ").trim();
  if (!collapsed) return "(empty)";
  if (collapsed.length <= SQL_FINGERPRINT_MAX) return collapsed;
  return `${collapsed.slice(0, SQL_FINGERPRINT_MAX - 3)}...`;
}

export function sqlFromNeonBody(body: unknown): string {
  if (typeof body !== "string" || body === "") return "(unknown)";
  try {
    const parsed = JSON.parse(body) as {
      query?: unknown;
      queries?: unknown;
    };
    if (typeof parsed.query === "string") {
      return fingerprintNeonSql(parsed.query);
    }
    if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
      const parts = parsed.queries.map((item) => {
        if (typeof item === "string") return fingerprintNeonSql(item);
        if (
          item &&
          typeof item === "object" &&
          "query" in item &&
          typeof (item as { query: unknown }).query === "string"
        ) {
          return fingerprintNeonSql((item as { query: string }).query);
        }
        return "(unknown)";
      });
      return fingerprintNeonSql(parts.join(" | "));
    }
  } catch {
    return "(unknown)";
  }
  return "(unknown)";
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

/** Calendar time any Neon trip was in flight (overlap union). */
export function unionIntervalMs(
  trips: ReadonlyArray<Pick<DbCostTrip, "startMs" | "endMs">>,
): number {
  if (trips.length === 0) return 0;
  const sorted = [...trips].sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let curStart = sorted[0]!.startMs;
  let curEnd = sorted[0]!.endMs;
  for (let i = 1; i < sorted.length; i++) {
    const trip = sorted[i]!;
    if (trip.startMs <= curEnd) {
      curEnd = Math.max(curEnd, trip.endMs);
    } else {
      total += curEnd - curStart;
      curStart = trip.startMs;
      curEnd = trip.endMs;
    }
  }
  return total + (curEnd - curStart);
}

export type MeteredDbTripHeader = { ms: number; sql: string };

export function encodeMeteredDbTripsHeader(trips: DbCostTrip[]): string {
  const compact: MeteredDbTripHeader[] = trips.map((trip) => ({
    ms: trip.ms,
    sql: trip.sql,
  }));
  let json = JSON.stringify(compact);
  if (json.length <= TRIP_HEADER_MAX) return json;
  return JSON.stringify(
    compact.map((trip) => ({
      ms: trip.ms,
      sql:
        trip.sql.length > 48 ? `${trip.sql.slice(0, 45)}...` : trip.sql,
    })),
  );
}

export function parseMeteredDbTripsHeader(
  raw: string | null,
): MeteredDbTripHeader[] | undefined {
  if (raw == null || raw === "") return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const trips: MeteredDbTripHeader[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const ms = (item as { ms?: unknown }).ms;
      const sql = (item as { sql?: unknown }).sql;
      if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) continue;
      if (typeof sql !== "string") continue;
      trips.push({ ms: Math.round(ms), sql });
    }
    return trips.length > 0 ? trips : undefined;
  } catch {
    return undefined;
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
  const ended = Date.now();
  const statements = countStatements(init?.body);
  cost.dbRoundTrips += 1;
  cost.dbStatements += statements;
  cost.dbBytes += body.byteLength;
  cost.dbMs += ended - started;
  cost.trips.push({
    startMs: started,
    endMs: ended,
    ms: ended - started,
    statements,
    sql: sqlFromNeonBody(init?.body),
    bytes: body.byteLength,
  });
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
