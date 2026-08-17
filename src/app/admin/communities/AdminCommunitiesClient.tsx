"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  clearCommunityEditionFreezeAction,
  clearCommunitySeedsAction,
  loadCommunitySeedStatsAction,
  publishCommunityEditionSeedAction,
  refreshCommunityEditionResultsAction,
  seedCommunityEditionAction,
} from "./actions";

const COUNT_PRESETS = [5, 10, 25, 50, 100, 250, 500] as const;
const BATCH_SIZE = 50;

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

  async function runBatch(opts: {
    startIndex: number;
    count: number;
    voiceCount: number;
    reseed: boolean;
    refreshPublishedResults: boolean;
  }) {
    return seedCommunityEditionAction({
      communitySlug: slug,
      year,
      startIndex: opts.startIndex,
      count: opts.count,
      listSize,
      voiceCount: opts.voiceCount,
      ratingBias,
      poolSize,
      reseed: opts.reseed,
      refreshPublishedResults: opts.refreshPublishedResults,
    });
  }

  async function maybeRefreshPublished(doneMessage: string) {
    if (!refreshPublished) {
      setMessage(doneMessage);
      return;
    }
    const result = await refreshCommunityEditionResultsAction({
      communitySlug: slug,
      year,
    });
    if ("error" in result) {
      setMessage(
        `${doneMessage} Freeze rebuild failed (${result.error}). Use Publish / rebuild results.`,
      );
      return;
    }
    setMessage(
      result.refreshed
        ? `${doneMessage} Published results refreshed.`
        : doneMessage,
    );
  }

  async function seedOnce() {
    setMessage(null);
    setRunning(true);
    stopRef.current = false;
    let hadError = false;

    try {
      const loaded = await loadCommunitySeedStatsAction({
        communitySlug: slug.trim() || undefined,
      });
      const maxIndex =
        "maxIndex" in loaded ? loaded.maxIndex : (stats?.maxIndex ?? 0);
      if ("profiles" in loaded) {
        setStats({
          profiles: loaded.profiles,
          maxIndex: loaded.maxIndex,
          membersInCommunity: loaded.membersInCommunity,
          ballotsInEdition: loaded.ballotsInEdition,
        });
      }

      let startIndex = reseed ? 1 : Math.max(1, maxIndex + 1);
      let remaining = Math.min(500, Math.max(1, Math.floor(count)));
      let remainingVoices = Math.max(0, Math.floor(voiceCount));
      let createdProfiles = 0;
      let createdBallots = 0;
      let updatedBallots = 0;
      let joinedMembers = 0;
      let voicesSet = 0;
      let skipped = 0;
      let lastEnd = 0;
      let wroteAnything = false;
      let editionStatus = "";

      while (remaining > 0 && !stopRef.current) {
        const batch = Math.min(BATCH_SIZE, remaining);
        const voicesThisBatch = Math.min(remainingVoices, batch);
        remainingVoices -= voicesThisBatch;
        const result = await runBatch({
          startIndex,
          count: batch,
          voiceCount: voicesThisBatch,
          reseed,
          refreshPublishedResults: false,
        });
        if ("error" in result) {
          setMessage(result.error);
          hadError = true;
          break;
        }
        wroteAnything = true;
        createdProfiles += result.createdProfiles;
        createdBallots += result.createdBallots;
        updatedBallots += result.updatedBallots;
        joinedMembers += result.joinedMembers;
        voicesSet += result.voicesSet;
        skipped += result.skipped;
        lastEnd = result.endIndex;
        editionStatus = result.editionStatus;
        startIndex = result.nextIndex;
        remaining -= batch;
        setMessage(
          `Progress: seeded through member ${result.endIndex}… (${createdBallots + updatedBallots} ballots, ${joinedMembers} joined so far)`,
        );
      }

      if (wroteAnything && !hadError) {
        const stoppedEarly = stopRef.current && remaining > 0;
        const done = stoppedEarly
            ? `Stopped. Through member ${lastEnd}: +${createdProfiles} profiles, ${createdBallots} new / ${updatedBallots} updated ballots, ${joinedMembers} joined, ${voicesSet} Hosts, ${skipped} skipped. Edition ${year} is ${editionStatus}.`
            : `Done through member ${lastEnd}: +${createdProfiles} profiles, ${createdBallots} new / ${updatedBallots} updated ballots, ${joinedMembers} joined, ${voicesSet} Hosts, ${skipped} skipped. Edition ${year} is ${editionStatus}. Open /communities/${slug.trim()}/edition/${year} as a host to preview submitters, or publish below for public results.`;
        await maybeRefreshPublished(done);
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
    let remainingVoices = Math.max(0, Math.floor(voiceCount));
    let totalProfiles = 0;
    let totalBallots = 0;
    let joinedMembers = 0;
    let voicesSet = 0;
    let wroteAnything = false;
    let hadError = false;
    let lastEnd = 0;

    try {
      const loaded = await loadCommunitySeedStatsAction({
        communitySlug: slug.trim() || undefined,
      });
      if ("maxIndex" in loaded) {
        startIndex = Math.max(1, loaded.maxIndex + 1);
        setStats({
          profiles: loaded.profiles,
          maxIndex: loaded.maxIndex,
          membersInCommunity: loaded.membersInCommunity,
          ballotsInEdition: loaded.ballotsInEdition,
        });
      }

      while (!stopRef.current) {
        const voicesThisBatch = Math.min(remainingVoices, BATCH_SIZE);
        remainingVoices -= voicesThisBatch;
        const result = await runBatch({
          startIndex,
          count: BATCH_SIZE,
          voiceCount: voicesThisBatch,
          reseed: false,
          refreshPublishedResults: false,
        });
        if ("error" in result) {
          setMessage(result.error);
          hadError = true;
          break;
        }
        wroteAnything = true;
        totalProfiles += result.createdProfiles;
        totalBallots += result.createdBallots + result.updatedBallots;
        joinedMembers += result.joinedMembers;
        voicesSet += result.voicesSet;
        lastEnd = result.endIndex;
        startIndex = result.nextIndex;
        setMessage(
          `Running… through member ${result.endIndex} (+${totalBallots} ballots). Click Stop to finish.`,
        );
        await refreshStats();
      }

      if (wroteAnything && !hadError) {
        await maybeRefreshPublished(
          `Stopped at member index ${lastEnd}. Added ~${totalProfiles} profiles / ${totalBallots} ballot writes / ${joinedMembers} joined / ${voicesSet} Hosts.`,
        );
      }
      await refreshStats();
    } finally {
      setRunning(false);
    }
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
        `Cleared ${result.removedBallots} ballots, ${result.removedMembers} memberships, ${result.removedVoices} Hosts${deleteProfiles ? `, deleted ${result.deletedProfiles} profiles` : ""}.`,
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

  const busy = pending || running;

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
        ballot list on the Edition page. Public Community/Hosts boards appear
        after you publish. Large counts run in batches of {BATCH_SIZE} so you
        can stop between batches.
      </p>

      <div className="space-y-4">
        <label className="block text-sm text-muted">
          Community slug
          <input
            className={`${fieldInputClass} mt-1`}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="kinda_funny"
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Edition year
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={busy}
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
                disabled={busy}
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
          <label className="mt-3 block text-sm text-muted">
            Custom count (1–500 this run, in batches of {BATCH_SIZE}; no total
            cap — uncheck Reseed to append, or keep seeding until Stop)
            <input
              className={`${fieldInputClass} mt-1`}
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={busy}
            />
          </label>
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
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-muted">
          Hosts from the start of this run
          <input
            className={`${fieldInputClass} mt-1`}
            type="number"
            min={0}
            max={count}
            value={voiceCount}
            onChange={(e) => setVoiceCount(Number(e.target.value))}
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={reseed}
            onChange={(e) => setReseed(e.target.checked)}
            disabled={busy}
          />
          Reseed existing ballots for these members
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={refreshPublished}
            onChange={(e) => setRefreshPublished(e.target.checked)}
            disabled={busy}
          />
          If already published, rebuild frozen results after seed (needed to
          include new ballots)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            void seedOnce();
          }}
        >
          {running ? "Working…" : "Seed members + ballots"}
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
          onClick={() => {
            void seedUntilStopped();
          }}
        >
          Keep seeding until Stop
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
          variant="danger-bordered"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              if (
                !window.confirm(
                  `Delete frozen results for ${slug.trim() || "(slug)"} ${year}? Ballots stay; boards clear until rebuilt.`,
                )
              ) {
                return;
              }
              const result = await clearCommunityEditionFreezeAction({
                communitySlug: slug,
                year,
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Cleared freeze data. Use Publish / rebuild results to recompute. ${result.path}`,
              );
              await refreshStats();
            })
          }
        >
          Delete freeze data
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
          onClick={() => startTransition(() => refreshStats())}
        >
          Refresh stats
        </Button>
      </div>

      <div className="border-t border-line pt-6 space-y-3">
        <p className="text-sm text-muted">
          Clear removes seed memberships, Hosts, and ballots
          {slug.trim() ? ` for “${slug.trim()}”` : " for all communities"}.
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={deleteProfiles}
            onChange={(e) => setDeleteProfiles(e.target.checked)}
            disabled={busy}
          />
          Also delete seed profiles
        </label>
        <Button
          type="button"
          variant="bordered"
          disabled={busy}
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
