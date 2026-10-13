import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
} from "@/lib/cloudflare/workers-cache";

/** Colo-local. TTL is the purge. Signed-in Comparison stays live. */
export const EDITION_PUBLIC_CACHE_MAX_AGE_SECONDS = 60;

export type EditionBoardCacheKeyInput = {
  editionId: string;
  view: string;
  mode: string;
  rankMode: string;
  categoryId?: string | null;
  page?: number;
  votersPage?: number;
  q?: string;
};

type CachedMeta = {
  frozenAt: string;
  ballotCountCommunity: number;
  ballotCountVoices: number;
  gotyTotalCommunity: number;
  gotyTotalVoices: number;
  customAwardsSettled?: boolean;
};

export type EditionBoardCacheValue<T> = T & {
  meta: CachedMeta;
};

export function editionBoardCacheKey(input: EditionBoardCacheKeyInput): string {
  const q = (input.q ?? "").trim().toLowerCase();
  return [
    input.editionId,
    input.view,
    input.mode,
    input.rankMode,
    input.categoryId ?? "",
    String(input.page ?? 1),
    String(input.votersPage ?? 1),
    q,
  ].join("/");
}

function editionBoardCacheRequest(key: string): Request {
  return new Request(
    `https://thegamies.internal/cache/edition-public/${encodeURIComponent(key)}`,
  );
}

function reviveDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export async function matchEditionBoard<T>(
  key: string,
): Promise<T | null> {
  const hit = await matchWorkersCacheJson<{ meta?: { frozenAt?: unknown } }>(
    editionBoardCacheRequest(key),
  );
  if (!hit?.meta || typeof hit.meta.frozenAt !== "string") return null;
  return {
    ...hit,
    meta: {
      ...hit.meta,
      frozenAt: reviveDate(hit.meta.frozenAt),
    },
  } as T;
}

export async function putEditionBoard(
  key: string,
  value: { meta: { frozenAt: Date } },
): Promise<void> {
  const stored = {
    ...value,
    meta: {
      ...value.meta,
      frozenAt: value.meta.frozenAt.toISOString(),
    },
  };
  await putWorkersCacheJson(
    editionBoardCacheRequest(key),
    stored,
    EDITION_PUBLIC_CACHE_MAX_AGE_SECONDS,
  );
}
