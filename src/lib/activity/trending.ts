import {
  ACTIVITY_KINDS,
  type ActivityKind,
} from "./kinds";

export type TrendingEventInput = {
  profileId: string;
  gameId: string | null;
  kind: string;
  isAdult?: boolean;
  createdAt?: Date;
};

export type TrendingScore = {
  gameId: string;
  people: number;
  score: number;
};

/** Sort weights for a person's most recent counting event on a game. */
export type TrendingRecencyWeights = {
  hours24: number;
  days1to3: number;
  restOf7d: number;
  days7to30: number;
};

export const DEFAULT_TRENDING_RECENCY_WEIGHTS: TrendingRecencyWeights = {
  hours24: 1,
  days1to3: 0.5,
  restOf7d: 0.25,
  days7to30: 0.125,
};

export const TRENDING_RECENCY_WEIGHT_MIN = 0;
export const TRENDING_RECENCY_WEIGHT_MAX = 10;

/** Playing is slightly more hype than wishlist / backlog / beat / GOTY-add. */
export const TRENDING_PLAYING_KIND_WEIGHT = 1.25;

/** Sort multiplier for the person's most recent counting event kind. Zero omits. */
export type TrendingKindWeights = Record<ActivityKind, number>;

export const DEFAULT_TRENDING_KIND_WEIGHTS: TrendingKindWeights = {
  library_wishlist: 1,
  library_backlog: 1,
  library_playing: TRENDING_PLAYING_KIND_WEIGHT,
  library_paused: 0,
  library_beat: 1,
  library_dropped: 0,
  library_cleared: 0,
  list_add: 1,
  list_remove: 0,
  list_reveal: 0,
};

const MS_PER_HOUR = 60 * 60 * 1000;

/** Extra sort weight for the person's most recent counting event kind. */
export function kindWeightForTrending(
  kind: string,
  weights: TrendingKindWeights = DEFAULT_TRENDING_KIND_WEIGHTS,
): number {
  if (!(ACTIVITY_KINDS as readonly string[]).includes(kind)) return 0;
  return weights[kind as ActivityKind];
}

/** Event kinds whose weight is above zero — those count on trending boards. */
export function countingKindsFromWeights(
  weights: TrendingKindWeights = DEFAULT_TRENDING_KIND_WEIGHTS,
): ActivityKind[] {
  return ACTIVITY_KINDS.filter((kind) => weights[kind] > 0);
}

export function parseTrendingRecencyWeight(
  raw: unknown,
  fallback: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n * 1000) / 1000;
  if (rounded < TRENDING_RECENCY_WEIGHT_MIN) return TRENDING_RECENCY_WEIGHT_MIN;
  return Math.min(rounded, TRENDING_RECENCY_WEIGHT_MAX);
}

export function parseTrendingRecencyWeights(
  raw?: Partial<TrendingRecencyWeights> | null,
): TrendingRecencyWeights {
  return {
    hours24: parseTrendingRecencyWeight(
      raw?.hours24,
      DEFAULT_TRENDING_RECENCY_WEIGHTS.hours24,
    ),
    days1to3: parseTrendingRecencyWeight(
      raw?.days1to3,
      DEFAULT_TRENDING_RECENCY_WEIGHTS.days1to3,
    ),
    restOf7d: parseTrendingRecencyWeight(
      raw?.restOf7d,
      DEFAULT_TRENDING_RECENCY_WEIGHTS.restOf7d,
    ),
    days7to30: parseTrendingRecencyWeight(
      raw?.days7to30,
      DEFAULT_TRENDING_RECENCY_WEIGHTS.days7to30,
    ),
  };
}

export function parseTrendingKindWeights(
  raw?: Partial<Record<string, unknown>> | null,
): TrendingKindWeights {
  const parsed = { ...DEFAULT_TRENDING_KIND_WEIGHTS };
  if (!raw || typeof raw !== "object") return parsed;
  for (const kind of ACTIVITY_KINDS) {
    if (raw[kind] === undefined) continue;
    parsed[kind] = parseTrendingRecencyWeight(
      raw[kind],
      DEFAULT_TRENDING_KIND_WEIGHTS[kind],
    );
  }
  return parsed;
}

/** Bucket weight from how long ago the person's last counting event was. */
export function recencyWeightForAgeMs(
  ageMs: number,
  weights: TrendingRecencyWeights = DEFAULT_TRENDING_RECENCY_WEIGHTS,
): number {
  const ageHours = ageMs / MS_PER_HOUR;
  if (ageHours <= 24) return weights.hours24;
  if (ageHours <= 72) return weights.days1to3;
  if (ageHours <= 24 * 7) return weights.restOf7d;
  return weights.days7to30;
}

type LatestCountingEvent = { lastMs: number; kind: string };

/**
 * Distinct people per game. Sort by recency × kind weight; `people` stays a
 * real headcount. Adult / missing game_id / weight-zero kinds do not count.
 * One person per game uses their most recent counting event (higher kind
 * weight wins timestamp ties).
 */
export function scoreTrending(
  rows: readonly TrendingEventInput[],
  opts: {
    now?: Date;
    weights?: Partial<TrendingRecencyWeights> | null;
    kindWeights?: Partial<Record<string, unknown>> | null;
  } = {},
): TrendingScore[] {
  const nowMs = (opts.now ?? new Date()).getTime();
  const weights = parseTrendingRecencyWeights(opts.weights);
  const kindWeights = parseTrendingKindWeights(opts.kindWeights);
  const latest = new Map<string, Map<string, LatestCountingEvent>>();
  for (const row of rows) {
    if (!row.gameId) continue;
    if (row.isAdult) continue;
    if (kindWeightForTrending(row.kind, kindWeights) <= 0) continue;
    const t = row.createdAt?.getTime();
    const lastMs = Number.isFinite(t) ? (t as number) : nowMs;
    let byPerson = latest.get(row.gameId);
    if (!byPerson) {
      byPerson = new Map();
      latest.set(row.gameId, byPerson);
    }
    const prev = byPerson.get(row.profileId);
    if (
      prev == null ||
      lastMs > prev.lastMs ||
      (lastMs === prev.lastMs &&
        kindWeightForTrending(row.kind, kindWeights) >
          kindWeightForTrending(prev.kind, kindWeights))
    ) {
      byPerson.set(row.profileId, { lastMs, kind: row.kind });
    }
  }
  return [...latest.entries()]
    .map(([gameId, byPerson]) => {
      let score = 0;
      for (const event of byPerson.values()) {
        score +=
          recencyWeightForAgeMs(nowMs - event.lastMs, weights) *
          kindWeightForTrending(event.kind, kindWeights);
      }
      return { gameId, people: byPerson.size, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.people - a.people ||
        a.gameId.localeCompare(b.gameId),
    );
}

export const DEFAULT_TRENDING_WINDOW_HOURS = 24 * 7;
export const TRENDING_WINDOW_HOURS = [24, 24 * 7, 24 * 30] as const;
export type TrendingWindowHours = (typeof TRENDING_WINDOW_HOURS)[number];

export function parseTrendingWindowHours(raw: unknown): TrendingWindowHours {
  const n = Number(raw);
  if (n === 24 || n === 24 * 30) return n;
  return DEFAULT_TRENDING_WINDOW_HOURS;
}

export const DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE = 5;
export const PUBLIC_TRENDING_MIN_PEOPLE_MAX = 1000;

export function parsePublicTrendingMinPeople(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE;
  return Math.min(n, PUBLIC_TRENDING_MIN_PEOPLE_MAX);
}

export function isPublicTrendingReady(
  distinctPeople: number,
  min: number,
): boolean {
  const n = Number.isFinite(distinctPeople) ? distinctPeople : 0;
  const floor = Number.isFinite(min) ? min : DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE;
  return n >= floor;
}
