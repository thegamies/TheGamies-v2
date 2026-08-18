"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { RadioOption } from "@/components/ui/Radio";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import {
  loadYearStatsAction,
  rebuildYearAction,
  refreshYearAction,
  saveLandingYearsAction,
  savePublicBoardMinCategoryVotesAction,
  savePublicBoardMinListsAction,
  saveRankModeAction,
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

const RANK_MODE_OPTIONS: Array<{
  id: SharedRankMode;
  label: string;
  hint: string;
}> = [
  {
    id: "competition",
    label: "Competition",
    hint: "Tied games share a place. The next place skips (1 · 1 · 3).",
  },
  {
    id: "dense",
    label: "Dense",
    hint: "Tied games share a place. The next place is the next number (1 · 1 · 2).",
  },
];

type Props = {
  authorized: boolean;
  initialYear: number;
  initialStats: YearStats | null;
  initialLandingYears: number[] | null;
  initialRankMode: SharedRankMode;
  initialPublicBoardMinLists: number;
  initialPublicBoardMinCategoryVotes: number;
};

export function AdminRankingsClient({
  authorized: initiallyAuthorized,
  initialYear,
  initialStats,
  initialLandingYears,
  initialRankMode,
  initialPublicBoardMinLists,
  initialPublicBoardMinCategoryVotes,
}: Props) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState(initialYear);
  const [stats, setStats] = useState<YearStats | null>(initialStats);
  const [landingYearsInput, setLandingYearsInput] = useState(
    initialLandingYears?.join(", ") ?? "",
  );
  const [landingYearsSaved, setLandingYearsSaved] = useState<number[] | null>(
    initialLandingYears,
  );
  const [rankMode, setRankMode] = useState<SharedRankMode>(initialRankMode);
  const [minListsInput, setMinListsInput] = useState(
    String(initialPublicBoardMinLists),
  );
  const [minListsSaved, setMinListsSaved] = useState(
    initialPublicBoardMinLists,
  );
  const [minCategoryVotesInput, setMinCategoryVotesInput] = useState(
    String(initialPublicBoardMinCategoryVotes),
  );
  const [minCategoryVotesSaved, setMinCategoryVotesSaved] = useState(
    initialPublicBoardMinCategoryVotes,
  );
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
    <div className="max-w-xl space-y-10">
      <section className="space-y-4 border-b border-line pb-10">
        <h2 className="font-display text-2xl tracking-wide text-ink">
          Homepage years
        </h2>
        <p className="text-sm text-muted">
          Comma-separated years for the homepage Top 5 strips. Leave blank to
          use the current and previous calendar years.
        </p>
        <label className="block text-sm text-muted">
          Years
          <input
            type="text"
            className={`${fieldInputClass} mt-1`}
            value={landingYearsInput}
            onChange={(e) => setLandingYearsInput(e.target.value)}
            placeholder={`${initialYear}, ${initialYear - 1}`}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await saveLandingYearsAction(landingYearsInput);
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setLandingYearsSaved(result.landingStandingsYears ?? null);
                setLandingYearsInput(
                  result.landingStandingsYears?.join(", ") ?? "",
                );
                setMessage(
                  result.landingStandingsYears == null
                    ? "Homepage years cleared — using current and previous."
                    : `Homepage years set to ${result.landingStandingsYears.join(", ")}.`,
                );
              })
            }
          >
            Save homepage years
          </Button>
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await saveLandingYearsAction("");
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setLandingYearsSaved(null);
                setLandingYearsInput("");
                setMessage(
                  "Homepage years cleared — using current and previous.",
                );
              })
            }
          >
            Use default
          </Button>
        </div>
        <p className="text-xs text-muted">
          Active override:{" "}
          {landingYearsSaved == null
            ? "none (current + previous)"
            : landingYearsSaved.join(", ")}
        </p>
      </section>

      <section className="space-y-4 border-b border-line pb-10">
        <h2 className="font-display text-2xl tracking-wide text-ink">
          Public boards
        </h2>
        <p className="text-sm text-muted">
          Minimum lists before Game of the Year for a year is public. A
          category stays hidden until that award has this many votes.
        </p>
        <label className="block text-sm text-muted">
          Minimum lists
          <input
            type="number"
            min={1}
            max={1000}
            className={`${fieldInputClass} mt-1`}
            value={minListsInput}
            onChange={(e) => setMinListsInput(e.target.value)}
            autoComplete="off"
          />
        </label>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await savePublicBoardMinListsAction(minListsInput);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              if (result.publicBoardMinLists != null) {
                setMinListsSaved(result.publicBoardMinLists);
                setMinListsInput(String(result.publicBoardMinLists));
              }
              setMessage("List minimum saved.");
            })
          }
        >
          Save list minimum
        </Button>
        <p className="text-xs text-muted">
          Current list minimum: {minListsSaved}
        </p>
        <label className="block text-sm text-muted">
          Minimum category votes
          <input
            type="number"
            min={1}
            max={1000}
            className={`${fieldInputClass} mt-1`}
            value={minCategoryVotesInput}
            onChange={(e) => setMinCategoryVotesInput(e.target.value)}
            autoComplete="off"
          />
        </label>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await savePublicBoardMinCategoryVotesAction(
                minCategoryVotesInput,
              );
              if (result.error) {
                setMessage(result.error);
                return;
              }
              if (result.publicBoardMinCategoryVotes != null) {
                setMinCategoryVotesSaved(result.publicBoardMinCategoryVotes);
                setMinCategoryVotesInput(
                  String(result.publicBoardMinCategoryVotes),
                );
              }
              setMessage("Category vote minimum saved.");
            })
          }
        >
          Save category minimum
        </Button>
        <p className="text-xs text-muted">
          Current category vote minimum: {minCategoryVotesSaved}
        </p>
      </section>

      <section className="space-y-4 border-b border-line pb-10">
        <h2 className="font-display text-2xl tracking-wide text-ink">
          Tie numbering
        </h2>
        <p className="text-sm text-muted">
          How site live boards number ties. Changing this does not rescore
          lists.
        </p>
        <fieldset className="space-y-3">
          <legend className="sr-only">Tie numbering</legend>
          {RANK_MODE_OPTIONS.map((opt) => (
            <RadioOption
              key={opt.id}
              name="siteRankMode"
              value={opt.id}
              checked={rankMode === opt.id}
              onChange={() => setRankMode(opt.id)}
              hint={opt.hint}
            >
              {opt.label}
            </RadioOption>
          ))}
        </fieldset>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await saveRankModeAction(rankMode);
              if (result.error) {
                setMessage(result.error);
                return;
              }
              if (result.rankMode) setRankMode(result.rankMode);
              setMessage(
                result.rankMode === "dense"
                  ? "Dense numbering is on for site live boards."
                  : "Competition numbering is on for site live boards.",
              );
            })
          }
        >
          Save numbering
        </Button>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl tracking-wide text-ink">
          Year cache
        </h2>
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
              <dd className="font-semibold text-ink">
                {stats.contribGeneration}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Scores generation</dt>
              <dd className="font-semibold text-ink">
                {stats.scoresGeneration}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Standings version</dt>
              <dd className="font-semibold text-ink">
                {stats.standingsVersion}
              </dd>
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
      </section>

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
