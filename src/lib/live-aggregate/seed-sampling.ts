import { LIST_MAX_ITEMS } from "@/lib/lists/schema";

export const SEED_WEIGHT_POWER_MIN = 0.1;
export const SEED_WEIGHT_POWER_MAX = 5;
/** Worker-safe cap when top N is unset (old seed loaded the full year). */
export const SEED_POOL_HARD_CAP = 10_000;

export type SeedDistribution = "weighted" | "uniform";

export type SeedSamplingParams = {
  minGamesPerList: number;
  maxGamesPerList: number;
  minRank: number;
  maxRank: number;
  distribution: SeedDistribution;
  /** Null = no top-N trim (still capped at SEED_POOL_HARD_CAP when loading). */
  topN: number | null;
  weightPower: number;
};

/**
 * Old Gamies GOTY load-test weight: critic volume × quality.
 * `ln(1 + rating_count) * (rating / 100)`; missing rating defaults to 75.
 */
export function igdbPickWeight(
  rating: number | null | undefined,
  ratingCount: number | null | undefined,
): number {
  const count = Math.max(ratingCount ?? 0, 0);
  const quality = (rating ?? 75) / 100;
  return Math.log(1 + count) * quality;
}

export function applySeedWeightPower(weight: number, power: number): number {
  return Math.max(weight ** power, 0.01);
}

/** Weighted sample without replacement: `ORDER BY -ln(random()) / weight`. */
export function weightedSampleExp<T>(
  items: T[],
  k: number,
  weightOf: (item: T) => number,
): T[] {
  if (k <= 0 || items.length === 0) return [];
  if (k >= items.length) return shuffle([...items]);

  const keyed = items.map((item) => {
    const w = Math.max(weightOf(item), 0.01);
    const u = Math.max(Math.random(), 1e-12);
    return { item, key: -Math.log(u) / w };
  });
  keyed.sort((a, b) => a.key - b.key);
  return keyed.slice(0, k).map((row) => row.item);
}

export function randomIntInclusive(min: number, max: number): number {
  const lo = Math.floor(min);
  const hi = Math.floor(max);
  if (hi <= lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

export function shuffle<T>(items: T[]): T[] {
  return shuffleInPlace([...items]);
}

export function normalizeSeedSampling(input: {
  minGamesPerList?: number;
  maxGamesPerList?: number;
  minRank?: number;
  maxRank?: number;
  distribution?: string;
  topN?: number | null;
  weightPower?: number;
}): SeedSamplingParams | { error: string } {
  const minRank = Math.floor(input.minRank ?? 1);
  const maxRank = Math.floor(input.maxRank ?? LIST_MAX_ITEMS);
  if (
    !Number.isFinite(minRank) ||
    !Number.isFinite(maxRank) ||
    minRank < 1 ||
    maxRank > LIST_MAX_ITEMS ||
    minRank > maxRank
  ) {
    return {
      error: `Min and max rank must be integers from 1 to ${LIST_MAX_ITEMS}, with min ≤ max.`,
    };
  }

  const rankSpan = maxRank - minRank + 1;
  const minGamesPerList = Math.floor(input.minGamesPerList ?? 1);
  const maxGamesPerList = Math.floor(input.maxGamesPerList ?? rankSpan);
  if (
    !Number.isFinite(minGamesPerList) ||
    !Number.isFinite(maxGamesPerList) ||
    minGamesPerList < 1 ||
    maxGamesPerList > rankSpan ||
    minGamesPerList > maxGamesPerList
  ) {
    return {
      error: `Games per list must be integers from 1 to the rank span (${rankSpan}), with min ≤ max.`,
    };
  }

  const distributionRaw = (input.distribution ?? "weighted").trim().toLowerCase();
  if (distributionRaw !== "weighted" && distributionRaw !== "uniform") {
    return { error: "Distribution must be weighted or uniform." };
  }

  let topN: number | null = null;
  if (input.topN != null && input.topN !== 0) {
    const parsed = Math.floor(input.topN);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { error: "Top N must be empty/0 (no limit) or an integer ≥ 1." };
    }
    topN = parsed;
  }

  const weightPower = input.weightPower ?? 1;
  if (
    typeof weightPower !== "number" ||
    Number.isNaN(weightPower) ||
    weightPower < SEED_WEIGHT_POWER_MIN ||
    weightPower > SEED_WEIGHT_POWER_MAX
  ) {
    return {
      error: `Weight power must be between ${SEED_WEIGHT_POWER_MIN} and ${SEED_WEIGHT_POWER_MAX}.`,
    };
  }

  return {
    minGamesPerList,
    maxGamesPerList,
    minRank,
    maxRank,
    distribution: distributionRaw,
    topN,
    weightPower,
  };
}

export type SeedListSample<T> = {
  picks: T[];
  /** Rank for each pick: minRank, minRank+1, … */
  ranks: number[];
};

/**
 * Draw one GOTY list from a pre-trimmed pool.
 * Length is random in [min, max], clamped to pool size and rank span.
 */
export function sampleSeedList<T>(
  pool: T[],
  sampling: SeedSamplingParams,
  weightOf: (item: T) => number,
): SeedListSample<T> {
  const rankSpan = sampling.maxRank - sampling.minRank + 1;
  const maxGames = Math.min(
    sampling.maxGamesPerList,
    pool.length,
    rankSpan,
  );
  const minGames = Math.min(sampling.minGamesPerList, maxGames);
  if (maxGames < 1 || pool.length === 0) {
    return { picks: [], ranks: [] };
  }

  const k = randomIntInclusive(minGames, maxGames);
  const picks =
    sampling.distribution === "uniform"
      ? shuffle(pool).slice(0, k)
      : weightedSampleExp(pool, k, weightOf);
  const ranks = picks.map((_, index) => sampling.minRank + index);
  return { picks, ranks };
}
