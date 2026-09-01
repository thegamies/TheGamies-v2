"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { resolveSeedStartIndex } from "@/lib/live-aggregate/seed-standings";
import {
  clearStandingsSeedsAction,
  loadSeedStatsAction,
  rebuildSeedYearAction,
  seedStandingsAction,
} from "./actions";

const COUNT_PRESETS = [10, 50, 100, 250, 500, 1000] as const;
const BATCH_SIZE = 50;

type Stats = { profiles: number; lists: number; maxIndex: number };
type Distribution = "weighted" | "uniform";

type Props = {
  initialYear: number;
  initialStats: Stats | null;
};

function parseTopN(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "0") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

export function AdminSeedClient({
  initialYear,
  initialStats,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [count, setCount] = useState(50);
  const [minGames, setMinGames] = useState(1);
  const [maxGames, setMaxGames] = useState(10);
  const [minRank, setMinRank] = useState(1);
  const [maxRank, setMaxRank] = useState(10);
  const [distribution, setDistribution] = useState<Distribution>("weighted");
  const [topN, setTopN] = useState("50");
  const [weightPower, setWeightPower] = useState(1);
  const [includeCategories, setIncludeCategories] = useState(false);
  const [reseed, setReseed] = useState(true);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const stopRef = useRef(false);

  async function refreshStats() {
    const loaded = await loadSeedStatsAction();
    if ("profiles" in loaded) {
      setStats({
        profiles: loaded.profiles,
        lists: loaded.lists,
        maxIndex: loaded.maxIndex,
      });
    }
  }

  async function runBatch(opts: {
    startIndex: number;
    count: number;
    rebuild: boolean;
  }) {
    return seedStandingsAction({
      year,
      startIndex: opts.startIndex,
      count: opts.count,
      minGamesPerList: minGames,
      maxGamesPerList: maxGames,
      minRank,
      maxRank,
      distribution,
      topN: parseTopN(topN),
      weightPower,
      includeCategories,
      reseed,
      rebuild: opts.rebuild,
    });
  }

  function categorySummary(votes: number, categoryCount: number): string {
    if (!includeCategories) return "GOTY only";
    return `${votes} category votes across ${categoryCount} categories`;
  }

  async function seedOnce() {
    setMessage(null);
    setRunning(true);
    stopRef.current = false;
    let hadError = false;

    try {
      // Fresh max index so Reseed-off appends instead of re-targeting 1…N.
      const loaded = await loadSeedStatsAction();
      const maxIndex =
        "maxIndex" in loaded ? loaded.maxIndex : (stats?.maxIndex ?? 0);
      if ("profiles" in loaded) {
        setStats({
          profiles: loaded.profiles,
          lists: loaded.lists,
          maxIndex: loaded.maxIndex,
        });
      }

      let startIndex = resolveSeedStartIndex({ reseed, maxIndex });
      if (startIndex > 1000) {
        setMessage(
          reseed
            ? "Seed index cannot exceed 1000."
            : "Already at 1000 seed voters. Clear some before adding more, or turn Reseed on to rewrite 1…N.",
        );
        return;
      }

      let remaining = Math.min(
        1000 - startIndex + 1,
        Math.min(1000, Math.max(1, Math.floor(count))),
      );
      let createdProfiles = 0;
      let createdLists = 0;
      let updatedLists = 0;
      let skipped = 0;
      let gamePoolSize = 0;
      let categoryCount = 0;
      let categoryVotes = 0;
      let lastEnd = 0;
      let wroteAnything = false;

      while (remaining > 0 && !stopRef.current) {
        const batch = Math.min(BATCH_SIZE, remaining);
        const nextRemaining = remaining - batch;
        const rebuild =
          nextRemaining <= 0 ||
          // Rebuild on this batch if stop was requested before it started
          stopRef.current;
        const result = await runBatch({
          startIndex,
          count: batch,
          rebuild,
        });
        if ("error" in result) {
          setMessage(result.error);
          hadError = true;
          break;
        }
        wroteAnything = true;
        createdProfiles += result.createdProfiles;
        createdLists += result.createdLists;
        updatedLists += result.updatedLists;
        skipped += result.skipped;
        gamePoolSize = result.gamePoolSize;
        categoryCount = result.categoryCount;
        categoryVotes += result.categoryVotes;
        lastEnd = result.endIndex;
        startIndex = result.nextIndex;
        remaining = nextRemaining;
        setMessage(
          `Progress: seeded through voter ${result.endIndex}… (${createdLists + updatedLists} lists, ${categorySummary(categoryVotes, categoryCount)} so far)`,
        );
        if (result.nextIndex > 1000) break;
      }

      if (wroteAnything && !hadError) {
        // If we stopped mid-run without a rebuild on the last batch, rebuild once.
        const stoppedEarly = stopRef.current && remaining > 0;
        if (stoppedEarly) {
          await rebuildSeedYearAction({ year });
        }
        setMessage(
          stoppedEarly
            ? `Stopped. Through voter ${lastEnd}: +${createdProfiles} profiles, ${createdLists} new / ${updatedLists} updated lists, ${skipped} skipped. ${categorySummary(categoryVotes, categoryCount)}. Pool ${gamePoolSize}.`
            : `Done through voter ${lastEnd}: +${createdProfiles} profiles, ${createdLists} new / ${updatedLists} updated lists, ${skipped} skipped. ${categorySummary(categoryVotes, categoryCount)}. Pool ${gamePoolSize} games.`,
        );
      }
      await refreshStats();
    } finally {
      setRunning(false);
    }
  }

  async function seedUntilStopped() {
    setMessage(null);
    setRunning(true);
    stopRef.current = false;
    let startIndex = Math.max(1, (stats?.maxIndex ?? 0) + 1);
    let totalLists = 0;
    let totalProfiles = 0;
    let categoryCount = 0;
    let categoryVotes = 0;
    let wroteAnything = false;
    let hadError = false;

    try {
      while (!stopRef.current && startIndex <= 1000) {
        const result = await runBatch({
          startIndex,
          count: Math.min(BATCH_SIZE, 1000 - startIndex + 1),
          rebuild: false,
        });
        if ("error" in result) {
          setMessage(result.error);
          hadError = true;
          break;
        }
        wroteAnything = true;
        totalProfiles += result.createdProfiles;
        totalLists += result.createdLists + result.updatedLists;
        categoryCount = result.categoryCount;
        categoryVotes += result.categoryVotes;
        startIndex = result.nextIndex;
        setMessage(
          `Running… through voter ${result.endIndex} (+${totalLists} lists, ${categorySummary(categoryVotes, categoryCount)}). Click Stop to finish.`,
        );
        await refreshStats();
      }

      if (wroteAnything && !hadError) {
        await rebuildSeedYearAction({ year });
        setMessage(
          stopRef.current
            ? `Stopped at voter index ${startIndex - 1}. Added ~${totalProfiles} profiles / ${totalLists} list writes / ${categorySummary(categoryVotes, categoryCount)}.`
            : `Filled through ${Math.min(1000, startIndex - 1)}. Added ~${totalProfiles} profiles / ${totalLists} list writes / ${categorySummary(categoryVotes, categoryCount)}.`,
        );
      }
      await refreshStats();
    } finally {
      setRunning(false);
    }
  }

  const busy = pending || running;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted">
        Synthetic voters and Game of the Year lists for standings QA. They
        cannot sign in. Picks weight the year pool by critic count × rating.
        Runs in batches of {BATCH_SIZE}; up to 1000 voters.
      </p>

      {stats ? (
        <p className="text-sm text-ink">
          Current seeds: {stats.profiles} profiles · {stats.lists} lists · max
          index {stats.maxIndex}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Year
          <input
            type="number"
            className={`${fieldInputClass} mt-1`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Distribution
          <select
            className={`${fieldInputClass} mt-1`}
            value={distribution}
            onChange={(e) =>
              setDistribution(e.target.value as Distribution)
            }
            disabled={busy}
          >
            <option value="weighted">Weighted (critic count × rating)</option>
            <option value="uniform">Uniform</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Min games per list
          <input
            type="number"
            min={1}
            max={100}
            className={`${fieldInputClass} mt-1`}
            value={minGames}
            onChange={(e) => setMinGames(Number(e.target.value))}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Max games per list
          <input
            type="number"
            min={1}
            max={100}
            className={`${fieldInputClass} mt-1`}
            value={maxGames}
            onChange={(e) => setMaxGames(Number(e.target.value))}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Min rank
          <input
            type="number"
            min={1}
            max={100}
            className={`${fieldInputClass} mt-1`}
            value={minRank}
            onChange={(e) => setMinRank(Number(e.target.value))}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Max rank
          <input
            type="number"
            min={1}
            max={100}
            className={`${fieldInputClass} mt-1`}
            value={maxRank}
            onChange={(e) => setMaxRank(Number(e.target.value))}
            disabled={busy}
          />
        </label>
      </div>

      <div>
        <p className="text-sm text-muted">Voters to create / reseed</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COUNT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              onClick={() => setCount(n)}
              className={`border px-3 py-1.5 text-sm ${
                count === n
                  ? "border-accent text-accent"
                  : "border-line text-muted hover:border-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={1000}
          className={`${fieldInputClass} mt-2`}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={busy}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Top N pool (blank = no limit)
          <input
            type="number"
            min={0}
            className={`${fieldInputClass} mt-1`}
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
            disabled={busy}
            placeholder="No limit"
          />
        </label>
        <label className="block text-sm text-muted">
          Weight power ({weightPower})
          <input
            type="number"
            min={0.1}
            max={5}
            step={0.1}
            className={`${fieldInputClass} mt-1`}
            value={weightPower}
            onChange={(e) => setWeightPower(Number(e.target.value))}
            disabled={busy}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        Pool is the top N year games by critic-count × rating. Higher power
        concentrates picks on the most-rated titles. Ranks beyond 10 still
        appear on lists but do not score standings.
      </p>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={includeCategories}
          onChange={(e) => setIncludeCategories(e.target.checked)}
          disabled={busy}
        />
        Include category votes (from each list’s GOTY ranks)
      </label>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={reseed}
          onChange={(e) => setReseed(e.target.checked)}
          disabled={busy}
        />
        Reseed: rewrite voters 1…N. Off = add N new voters after the current max
        index.
      </label>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            void seedOnce();
          }}
        >
          Seed {count} voters
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
          onClick={() => {
            void seedUntilStopped();
          }}
        >
          Keep adding until stopped
        </Button>
        {running ? (
          <Button
            type="button"
            variant="bordered"
            onClick={() => {
              stopRef.current = true;
              setMessage("Stopping after current batch…");
            }}
          >
            Stop
          </Button>
        ) : null}
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              const result = await clearStandingsSeedsAction({ year });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Removed ${result.deletedLists} lists and ${result.deletedProfiles} profiles for ${year}.`,
              );
              await refreshStats();
            });
          }}
        >
          Clear year seeds
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              const result = await clearStandingsSeedsAction({});
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Removed all seeds (${result.deletedLists} lists, ${result.deletedProfiles} profiles).`,
              );
              await refreshStats();
            });
          }}
        >
          Clear all seeds
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}

      <p className="text-sm text-muted">
        After seeding, open{" "}
        <a
          className="text-accent hover:underline"
          href={`/game-of-the-year/${year}`}
        >
          {year} standings
        </a>
        {includeCategories
          ? " (switch to Categories to confirm award votes)."
          : "."}
      </p>
    </div>
  );
}
