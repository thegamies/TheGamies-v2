"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  clearCommunitySeedsAction,
  loadCommunitySeedStatsAction,
  publishCommunityEditionSeedAction,
  seedCommunityEditionAction,
} from "./actions";

const COUNT_PRESETS = [5, 10, 25, 50, 100] as const;

type Stats = {
  profiles: number;
  maxIndex: number;
  membersInCommunity: number;
  ballotsInEdition: number;
};

type Props = {
  authorized: boolean;
  initialYear: number;
  initialStats: Stats | null;
};

export function AdminCommunitiesClient({
  authorized: initiallyAuthorized,
  initialYear,
  initialStats,
}: Props) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [slug, setSlug] = useState("");
  const [year, setYear] = useState(initialYear);
  const [count, setCount] = useState(10);
  const [listSize, setListSize] = useState(10);
  const [voiceCount, setVoiceCount] = useState(2);
  const [ratingBias, setRatingBias] = useState(40);
  const [poolSize, setPoolSize] = useState(500);
  const [reseed, setReseed] = useState(true);
  const [refreshPublished, setRefreshPublished] = useState(true);
  const [deleteProfiles, setDeleteProfiles] = useState(false);
  const [stats, setStats] = useState<Stats | null>(initialStats);
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
    await refreshStats();
  }

  async function refreshStats() {
    const loaded = await loadCommunitySeedStatsAction({
      communitySlug: slug.trim() || undefined,
    });
    if ("profiles" in loaded) {
      setStats({
        profiles: loaded.profiles,
        maxIndex: loaded.maxIndex,
        membersInCommunity: loaded.membersInCommunity,
        ballotsInEdition: loaded.ballotsInEdition,
      });
    }
  }

  function seed() {
    setMessage(null);
    startTransition(async () => {
      const result = await seedCommunityEditionAction({
        communitySlug: slug,
        year,
        startIndex: reseed ? 1 : Math.max(1, (stats?.maxIndex ?? 0) + 1),
        count,
        listSize,
        voiceCount,
        ratingBias,
        poolSize,
        reseed,
        refreshPublishedResults: refreshPublished,
      });
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `Seeded ${result.createdBallots + result.updatedBallots} ballots (${result.joinedMembers} joined, ${result.voicesSet} Voices). Edition ${result.year} is ${result.editionStatus}. Open /communities/${slug.trim()}/edition/${year} as a host to preview submitters, or publish below for public results.${result.resultsRefreshed ? " Published results refreshed." : ""}`,
      );
      await refreshStats();
    });
  }

  function clearSeeds() {
    setMessage(null);
    startTransition(async () => {
      const result = await clearCommunitySeedsAction({
        communitySlug: slug.trim() || undefined,
        deleteProfiles,
      });
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `Cleared ${result.removedBallots} ballots, ${result.removedMembers} memberships, ${result.removedVoices} Voices${deleteProfiles ? `, deleted ${result.deletedProfiles} profiles` : ""}.`,
      );
      await refreshStats();
    });
  }

  if (!authorized) {
    return (
      <form onSubmit={unlock} className="max-w-md space-y-4">
        <label className="block text-sm text-muted">
          Admin code
          <input
            className={`${fieldInputClass} mt-1`}
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="off"
          />
        </label>
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
    <div className="max-w-xl space-y-8">
      {stats ? (
        <p className="text-sm text-muted">
          Seed profiles: {stats.profiles} (max index {stats.maxIndex})
          {slug.trim()
            ? ` · in “${slug.trim()}”: ${stats.membersInCommunity} members, ${stats.ballotsInEdition} ballots`
            : null}
        </p>
      ) : null}

      <p className="mt-3 max-w-2xl text-sm text-muted">
        Seed members cannot sign in. While voting is open, hosts see a submitted
        ballot list on the Edition page. Public Community/Voices boards appear
        after you publish.
      </p>

      <div className="space-y-4">
        <label className="block text-sm text-muted">
          Community slug
          <input
            className={`${fieldInputClass} mt-1`}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="kinda_funny"
          />
        </label>
        <label className="block text-sm text-muted">
          Edition year
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <div>
          <p className="text-sm text-muted">Members / ballots this run</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {COUNT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`border px-3 py-1.5 text-sm ${
                  count === n
                    ? "border-accent text-accent"
                    : "border-line text-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm text-muted">
          Ballot length (1–100)
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            min={1}
            max={100}
            value={listSize}
            onChange={(e) => setListSize(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm text-muted">
          Voices in this batch (from the start of the batch)
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            min={0}
            max={count}
            value={voiceCount}
            onChange={(e) => setVoiceCount(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm text-muted">
          Rating bias (−100…100)
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            min={-100}
            max={100}
            value={ratingBias}
            onChange={(e) => setRatingBias(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm text-muted">
          Game pool size
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            min={50}
            max={2000}
            value={poolSize}
            onChange={(e) => setPoolSize(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={reseed}
            onChange={(e) => setReseed(e.target.checked)}
          />
          Reseed existing ballots for these members
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={refreshPublished}
            onChange={(e) => setRefreshPublished(e.target.checked)}
          />
          If already published, rebuild frozen results after seed (needed to
          include new ballots)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={pending} onClick={seed}>
          {pending ? "Working…" : "Seed members + ballots"}
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const result = await publishCommunityEditionSeedAction({
                communitySlug: slug,
                year,
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Published and rebuilt freeze from current ballots. Open ${result.path}`,
              );
              await refreshStats();
            })
          }
        >
          Publish / rebuild results
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() => startTransition(() => refreshStats())}
        >
          Refresh stats
        </Button>
      </div>

      <div className="border-t border-line pt-6 space-y-3">
        <p className="text-sm text-muted">
          Clear removes seed memberships, Voices, and ballots
          {slug.trim() ? ` for “${slug.trim()}”` : " for all communities"}.
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={deleteProfiles}
            onChange={(e) => setDeleteProfiles(e.target.checked)}
          />
          Also delete seed profiles
        </label>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={clearSeeds}
        >
          Clear community seeds
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
