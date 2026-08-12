"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  loadYearStatsAction,
  rebuildYearAction,
  refreshYearAction,
  setRevealAction,
} from "./actions";

type YearStats = {
  year: number;
  listCount: number;
  detailedStatsRevealed: boolean;
  contribGeneration: number;
  scoresGeneration: number;
  standingsVersion: number;
  refreshing: boolean;
};

type Props = {
  authorized: boolean;
  initialYear: number;
  initialStats: YearStats | null;
};

export function AdminRankingsClient({
  authorized: initiallyAuthorized,
  initialYear,
  initialStats,
}: Props) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState(initialYear);
  const [stats, setStats] = useState<YearStats | null>(initialStats);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    const loaded = await loadYearStatsAction(year);
    if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
  }

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      setMessage(null);
      try {
        await fn();
      } catch {
        setMessage("Something went wrong.");
      }
    });
  }

  if (!authorized) {
    return (
      <form onSubmit={unlock} className="max-w-md space-y-4">
        <p className="text-sm text-muted">
          Enter the admin unlock code to manage live standings.
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

  return (
    <div className="max-w-xl space-y-6">
      <label className="block text-sm text-muted">
        Year
        <input
          type="number"
          className={`${fieldInputClass} mt-1`}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </label>
      <Button
        type="button"
        variant="bordered"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const loaded = await loadYearStatsAction(year);
            if ("error" in loaded && loaded.error) {
              setMessage(loaded.error);
              return;
            }
            if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
          })
        }
      >
        Load year
      </Button>

      {stats ? (
        <dl className="grid grid-cols-2 gap-3 border border-line p-4 text-sm">
          <div>
            <dt className="text-muted">Lists</dt>
            <dd className="font-semibold text-ink">{stats.listCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Scores revealed</dt>
            <dd className="font-semibold text-ink">
              {stats.detailedStatsRevealed ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Contrib generation</dt>
            <dd className="font-semibold text-ink">{stats.contribGeneration}</dd>
          </div>
          <div>
            <dt className="text-muted">Scores generation</dt>
            <dd className="font-semibold text-ink">{stats.scoresGeneration}</dd>
          </div>
          <div>
            <dt className="text-muted">Standings version</dt>
            <dd className="font-semibold text-ink">{stats.standingsVersion}</dd>
          </div>
          <div>
            <dt className="text-muted">Refreshing</dt>
            <dd className="font-semibold text-ink">
              {stats.refreshing ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await setRevealAction(year, true);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              setMessage("Detailed scores are now public for this year.");
              const loaded = await loadYearStatsAction(year);
              if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
            })
          }
        >
          Reveal scores
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await setRevealAction(year, false);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              setMessage("Detailed scores are hidden again.");
              const loaded = await loadYearStatsAction(year);
              if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
            })
          }
        >
          Hide scores
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await refreshYearAction(year);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              setMessage("Dirty keys refreshed into the standings cache.");
              const loaded = await loadYearStatsAction(year);
              if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
            })
          }
        >
          Refresh dirty
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await rebuildYearAction(year);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              setMessage("Year cache rebuilt from contributions.");
              const loaded = await loadYearStatsAction(year);
              if ("stats" in loaded && loaded.stats) setStats(loaded.stats);
            })
          }
        >
          Rebuild year
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
