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

/** Count one outbound Neon Auth call and log it for Workers Logs. */
export function noteNeonAuthFetch(method: string, path: string, status: number) {
  const store = (globalThis as GlobalWithMeter)[METER_KEY]?.getStore();
  if (!store) return;
  store.authRoundTrips += 1;
  if (status === 429) store.auth429s += 1;
  console.log(
    JSON.stringify({
      type: NEON_AUTH_LOG_TYPE,
      method,
      path,
      status,
    }),
  );
}
