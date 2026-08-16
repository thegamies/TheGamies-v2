"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  clearStandingsSeedsAction,
  loadSeedStatsAction,
  rebuildSeedYearAction,
  seedStandingsAction,
} from "./actions";

const COUNT_PRESETS = [10, 50, 100, 250, 500, 1000] as const;
const BATCH_SIZE = 50;

type Stats = { profiles: number; lists: number; maxIndex: number };

type Props = {
  authorized: boolean;
  initialYear: number;
  initialStats: Stats | null;
};

export function AdminSeedClient({
  authorized: initiallyAuthorized,
  initialYear,
  initialStats,
}: Props) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState(initialYear);
  const [count, setCount] = useState(50);
  const [listSize, setListSize] = useState(10);
  const [ratingBias, setRatingBias] = useState(40);
  const [poolSize, setPoolSize] = useState(500);
  const [reseed, setReseed] = useState(true);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const stopRef = useRef(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (!res.ok) {
      setMessage("Could not unlock admin controls.");
      return;
    }
    setAuthorized(true);
    setSecret("");
    const loaded = await loadSeedStatsAction();
    if ("profiles" in loaded) {
      setStats({
        profiles: loaded.profiles,
        lists: loaded.lists,
        maxIndex: loaded.maxIndex,
      });
    }
  }

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
      listSize,
      ratingBias,
      poolSize,
      reseed,
      rebuild: opts.rebuild,
    });
  }

  async function seedOnce() {
    setMessage(null);
    setRunning(true);
    stopRef.current = false;
    let hadError = false;

    try {
      let startIndex = 1;
      let remaining = Math.min(1000, Math.max(1, Math.floor(count)));
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
          `Progress: seeded through voter ${result.endIndex}… (${createdLists + updatedLists} lists, ${categoryVotes} category votes so far)`,
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
            ? `Stopped. Through voter ${lastEnd}: +${createdProfiles} profiles, ${createdLists} new / ${updatedLists} updated lists, ${skipped} skipped. ${categoryVotes} category votes across ${categoryCount} categories. Pool ${gamePoolSize}.`
            : `Done through voter ${lastEnd}: +${createdProfiles} profiles, ${createdLists} new / ${updatedLists} updated lists, ${skipped} skipped. ${categoryVotes} category votes across ${categoryCount} categories. Pool ${gamePoolSize} games (bias ${ratingBias}).`,
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
          `Running… through voter ${result.endIndex} (+${totalLists} lists, ${categoryVotes} category votes). Click Stop to finish.`,
        );
        await refreshStats();
      }

      if (wroteAnything && !hadError) {
        await rebuildSeedYearAction({ year });
        setMessage(
          stopRef.current
            ? `Stopped at voter index ${startIndex - 1}. Added ~${totalProfiles} profiles / ${totalLists} list writes / ${categoryVotes} category votes (${categoryCount} categories).`
            : `Filled through ${Math.min(1000, startIndex - 1)}. Added ~${totalProfiles} profiles / ${totalLists} list writes / ${categoryVotes} category votes (${categoryCount} categories).`,
        );
      }
      await refreshStats();
    } finally {
      setRunning(false);
    }
  }

  if (!authorized) {
    return (
      <form onSubmit={unlock} className="max-w-md space-y-4">
        <p className="text-sm text-muted">
          Enter the admin unlock code to create standings seed data.
        </p>
        <input
          type="password"
          className={fieldInputClass}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          required
        />
        <Button type="submit">Unlock</Button>
        {message ? (
          <p className="text-sm text-accent" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    );
  }

  const busy = pending || running;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted">
        Synthetic voters, GOTY lists, and category votes for standings QA. They
        cannot sign in. Runs in batches of {BATCH_SIZE}; up to 1000 voters.
        Syncs the award catalog before each batch.
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
          Games per list
          <input
            type="number"
            min={1}
            max={10}
            className={`${fieldInputClass} mt-1`}
            value={listSize}
            onChange={(e) => setListSize(Number(e.target.value))}
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

      <label className="block text-sm text-muted">
        Rating bias ({ratingBias}): negative = prefer lower-rated, 0 = even,
        positive = prefer highly rated
        <input
          type="range"
          min={-100}
          max={100}
          step={5}
          className="mt-2 w-full"
          value={ratingBias}
          onChange={(e) => setRatingBias(Number(e.target.value))}
          disabled={busy}
        />
      </label>

      <label className="block text-sm text-muted">
        Candidate game pool size (top by popularity, then rating)
        <input
          type="number"
          min={50}
          max={2000}
          className={`${fieldInputClass} mt-1`}
          value={poolSize}
          onChange={(e) => setPoolSize(Number(e.target.value))}
          disabled={busy}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={reseed}
          onChange={(e) => setReseed(e.target.checked)}
          disabled={busy}
        />
        Reseed existing seed accounts in range (rewrite their rankings)
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
        </a>{" "}
        (switch to Categories to confirm award votes).
      </p>
    </div>
  );
}
