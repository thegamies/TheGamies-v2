import { AsyncLocalStorage } from "node:async_hooks";
import {
  emptyDbRequestCost,
  setDbRequestCostSlot,
  type DbRequestCost,
} from "@thegamies/db/request-cost";

/** Set on a journey's requests so its log lines can be filtered (`wrangler tail --header`). */
export const REQUEST_COST_JOURNEY_HEADER = "x-cost-journey";
/** Names the step inside a journey (e.g. `standings`). */
export const REQUEST_COST_STEP_HEADER = "x-cost-step";
export const REQUEST_COST_LOG_TYPE = "request_cost";
/** Staging meter only. Load runner reads these; not shown in product UI. */
export const REQUEST_COST_WALL_MS_HEADER = "x-cost-wall-ms";
export const REQUEST_COST_DB_MS_HEADER = "x-cost-db-ms";
export const REQUEST_COST_DB_TRIPS_HEADER = "x-cost-db-trips";

export type RequestCostEnv = {
  REQUEST_COST_METER?: string;
};

export type RequestKind =
  | "document"
  | "rsc"
  | "action"
  | "image"
  | "api"
  | "other";

export type RequestCostRecord = DbRequestCost & {
  type: typeof REQUEST_COST_LOG_TYPE;
  journey: string | null;
  step: string | null;
  kind: RequestKind;
  method: string;
  path: string;
  status: number;
  /** Uncompressed body bytes the Worker sent; Cloudflare compresses after this. */
  responseBytes: number;
  wallMs: number;
};

type FetchHandler<Env, Ctx> = (
  request: Request,
  env: Env,
  ctx: Ctx,
) => Response | Promise<Response>;

const storage = new AsyncLocalStorage<DbRequestCost>();

export function requestCostEnabled(env: RequestCostEnv | undefined): boolean {
  return env?.REQUEST_COST_METER === "1";
}

export function classifyRequest(request: Request): RequestKind {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/_next/image")) return "image";
  if (request.headers.has("next-action")) return "action";
  if (request.headers.get("rsc") === "1") return "rsc";
  if (pathname.startsWith("/api/")) return "api";
  const accept = request.headers.get("accept") ?? "";
  if (request.method === "GET" && accept.includes("text/html")) {
    return "document";
  }
  return "other";
}

function countBytes(
  body: ReadableStream<Uint8Array>,
  onDone: (bytes: number) => void,
): ReadableStream<Uint8Array> {
  let bytes = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        controller.enqueue(chunk);
      },
      flush() {
        onDone(bytes);
      },
    }),
  );
}

/**
 * Wrap the Worker `fetch` so each request logs one `request_cost` JSON line:
 * Neon round trips/statements/bytes, response bytes, and wall time. CPU time
 * comes from the invocation log Cloudflare records alongside it.
 */
export function withRequestCost<Env extends RequestCostEnv, Ctx>(
  handler: FetchHandler<Env, Ctx>,
  log: (line: string) => void = console.log,
): FetchHandler<Env, Ctx> {
  return async (request, env, ctx) => {
    if (!requestCostEnabled(env)) return handler(request, env, ctx);

    setDbRequestCostSlot(storage);
    const cost = emptyDbRequestCost();
    const started = Date.now();
    const url = new URL(request.url);
    const base = {
      type: REQUEST_COST_LOG_TYPE,
      journey: request.headers.get(REQUEST_COST_JOURNEY_HEADER),
      step: request.headers.get(REQUEST_COST_STEP_HEADER),
      kind: classifyRequest(request),
      method: request.method,
      path: `${url.pathname}${url.search}`,
    } as const;

    const emit = (status: number, responseBytes: number, wallMs: number) => {
      const record: RequestCostRecord = {
        ...base,
        status,
        responseBytes,
        wallMs,
        ...cost,
      };
      log(JSON.stringify(record));
    };

    const response = await storage.run(cost, () =>
      handler(request, env, ctx),
    );
    const wallMs = Date.now() - started;
    const headers = new Headers(response.headers);
    headers.set(REQUEST_COST_WALL_MS_HEADER, String(wallMs));
    headers.set(REQUEST_COST_DB_MS_HEADER, String(cost.dbMs));
    headers.set(REQUEST_COST_DB_TRIPS_HEADER, String(cost.dbRoundTrips));
    if (!response.body || response.status === 101) {
      emit(response.status, 0, wallMs);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return new Response(
      countBytes(response.body, (bytes) =>
        emit(response.status, bytes, Date.now() - started),
      ),
      {
        status: response.status,
        statusText: response.statusText,
        headers,
      },
    );
  };
}
