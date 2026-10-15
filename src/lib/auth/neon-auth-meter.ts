/**
 * Per-request Neon Auth call counter.
 *
 * The Worker entry and the OpenNext server bundle each carry their own copy
 * of this module. The slot lives on `globalThis` so both see the same store.
 * Staging sets the slot while a request is in flight. Production leaves it
 * unset, and then nothing is counted or logged.
 */
export const NEON_AUTH_LOG_TYPE = "neon_auth";

const METER_KEY = Symbol.for("thegamies.neonAuthMeter");

export type NeonAuthMeter = {
  authRoundTrips: number;
  auth429s: number;
};

export type NeonAuthMeterSlot = {
  getStore(): NeonAuthMeter | undefined;
};

type GlobalWithMeter = typeof globalThis & {
  [METER_KEY]?: NeonAuthMeterSlot;
};

export function setNeonAuthMeterSlot(slot: NeonAuthMeterSlot | undefined) {
  const globalRecord = globalThis as GlobalWithMeter;
  if (slot) globalRecord[METER_KEY] = slot;
  else delete globalRecord[METER_KEY];
}

export function neonAuthRetryAfter(headers: {
  get(name: string): string | null;
}): string | null {
  const raw = headers.get("x-retry-after") ?? headers.get("retry-after");
  const value = raw?.trim() ?? "";
  return value ? value : null;
}

/**
 * Count one outbound Neon Auth call and log it for Workers Logs.
 * A 429 also records how long Neon asked us to wait. Local `next dev` has
 * no request-cost meter, so that line is printed there too. Production stays
 * quiet unless the meter is on.
 */
export function noteNeonAuthFetch(
  method: string,
  path: string,
  status: number,
  retryAfter: string | null = null,
) {
  const store = (globalThis as GlobalWithMeter)[METER_KEY]?.getStore();
  if (store) {
    store.authRoundTrips += 1;
    if (status === 429) store.auth429s += 1;
  } else if (status !== 429 || process.env.NODE_ENV === "production") {
    return;
  }
  console.log(
    JSON.stringify({
      type: NEON_AUTH_LOG_TYPE,
      method,
      path,
      status,
      ...(status === 429 && retryAfter ? { retryAfter } : {}),
    }),
  );
}
