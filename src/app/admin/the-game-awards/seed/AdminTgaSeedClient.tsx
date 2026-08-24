"use client";

import { useRef, useState } from "react";
import { AdminTgaGate } from "../AdminTgaGate";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import {
  SEED_TGA_MAX_BATCH,
  tgaCommunitySeedSlugError,
} from "@/lib/tga-pickem/seed-sheets";
import {
  clearTgaCommunitySeedSheetsAction,
  clearTgaSeedSheetsAction,
  loadTgaCommunitySeedStatsAction,
  loadTgaSeedPageAction,
  loadTgaSeedStatsAction,
  seedTgaCommunitySheetsAction,
  seedTgaSheetsAction,
} from "./actions";

type Stats = {
  siteSheets: number;
  seedVoterSheets: number;
  seedVotersWithoutSheet: number;
};

type CommunityStats = {
  slug: string;
  communitySheets: number;
  seedMemberSheets: number;
  seedMembersWithoutSheet: number;
  optedIn: boolean;
};

type Props = {
  authorized: boolean;
  years: number[];
  initialYear: number;
  initialStats: Stats | null;
};

export function AdminTgaSeedClient({
  authorized,
  years,
  initialYear,
  initialStats,
}: Props) {
  const [pageYears, setPageYears] = useState(years);
  const [year, setYear] = useState(initialYear);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [communitySlug, setCommunitySlug] = useState("");
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  async function hydratePage() {
    const loaded = await loadTgaSeedPageAction();
    if ("ok" in loaded && loaded.ok) {
      setPageYears(loaded.years);
      setYear(loaded.year);
      setStats(loaded.stats);
    }
  }

  async function refreshCommunityStats(nextYear = year, slug = communitySlug) {
    const slugError = tgaCommunitySeedSlugError(slug);
    if (slugError) {
      setCommunityStats(null);
      return;
    }
    const loaded = await loadTgaCommunitySeedStatsAction(slug, nextYear);
    if ("error" in loaded) {
      setCommunityStats(null);
      setMessage(loaded.error);
      return;
    }
    setCommunityStats({
      slug: loaded.slug,
      communitySheets: loaded.communitySheets,
      seedMemberSheets: loaded.seedMemberSheets,
      seedMembersWithoutSheet: loaded.seedMembersWithoutSheet,
      optedIn: loaded.optedIn,
    });
  }

  async function refreshStats(nextYear = year) {
    const loaded = await loadTgaSeedStatsAction(nextYear);
    if ("ok" in loaded && loaded.ok) {
      setStats({
        siteSheets: loaded.siteSheets,
        seedVoterSheets: loaded.seedVoterSheets,
        seedVotersWithoutSheet: loaded.seedVotersWithoutSheet,
      });
    }
  }

  async function runEmptySeedVoters() {
    stopRef.current = false;
    setRunning(true);
    setMessage("Filling seed accounts with no sheet yet…");
    let afterProfileId: string | null = null;
    let wrote = 0;
    try {
      while (!stopRef.current) {
        const result = await seedTgaSheetsAction({
          year,
          afterProfileId,
        });
        if ("error" in result) {
          setMessage(result.error);
          return;
        }
        if (result.wrote === 0) break;
        wrote += result.wrote;
        afterProfileId = result.lastProfileId;
        setMessage(`Progress: wrote ${wrote} sheets…`);
        if (!result.lastProfileId || result.wrote < SEED_TGA_MAX_BATCH) break;
      }
      await refreshStats();
      setMessage(
        wrote === 0
          ? "Every seed account already has a sheet."
          : `Wrote ${wrote} sheets for seed accounts that had none.`,
      );
    } finally {
      setRunning(false);
    }
  }

  async function runEmptyCommunitySeedMembers() {
    const slugError = tgaCommunitySeedSlugError(communitySlug);
    if (slugError) {
      setMessage(slugError);
      return;
    }
    stopRef.current = false;
    setRunning(true);
    setMessage("Filling community seed members with no sheet yet…");
    let afterProfileId: string | null = null;
    let wrote = 0;
    try {
      while (!stopRef.current) {
        const result = await seedTgaCommunitySheetsAction({
          communitySlug,
          year,
          afterProfileId,
        });
        if ("error" in result) {
          setMessage(result.error);
          return;
        }
        if (result.wrote === 0) break;
        wrote += result.wrote;
        afterProfileId = result.lastProfileId;
        setMessage(`Progress: wrote ${wrote} community sheets…`);
        if (!result.lastProfileId || result.wrote < SEED_TGA_MAX_BATCH) break;
      }
      await refreshCommunityStats();
      setMessage(
        wrote === 0
          ? "Every seed member in this community already has a sheet."
          : `Wrote ${wrote} community sheets for seed members that had none.`,
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminTgaGate authorized={authorized} onUnlocked={() => void hydratePage()}>
      <div className="max-w-xl space-y-8">
        {stats ? (
          <p className="text-sm text-muted">
            {year}: {stats.seedVoterSheets} seed accounts already entered ·{" "}
            {stats.seedVotersWithoutSheet} still empty
          </p>
        ) : null}

        <label className="block text-sm">
          <span className="text-muted">Year</span>
          <select
            className={`${fieldInputClass} mt-1`}
            value={year}
            disabled={running || pageYears.length === 0}
            onChange={(event) => {
              const next = Number(event.target.value);
              setYear(next);
              void refreshStats(next);
              if (communitySlug.trim()) void refreshCommunityStats(next);
            }}
          >
            {pageYears.length === 0 ? (
              <option value={initialYear}>No years yet</option>
            ) : (
              pageYears.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={running || pageYears.length === 0}
            onClick={() => void runEmptySeedVoters()}
          >
            Seed empty seed accounts
          </Button>
          {running ? (
            <Button
              type="button"
              variant="bordered"
              onClick={() => {
                stopRef.current = true;
              }}
            >
              Stop
            </Button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="danger-bordered"
          disabled={running || pageYears.length === 0}
          onClick={() =>
            void (async () => {
              setMessage(null);
              const result = await clearTgaSeedSheetsAction(year);
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              await refreshStats();
              setMessage(
                `Removed ${result.deletedSheets} ${TGA_PUBLIC_LABEL} sheets from seed accounts.`,
              );
            })()
          }
        >
          Clear seed-account sheets
        </Button>

        <div className="space-y-4 border-t border-line pt-8">
          <h2 className="font-display text-3xl tracking-wide text-ink">
            Community
          </h2>
          <p className="text-sm text-muted">
            Fill empty sheets for seed members already in that community. The
            community must already be running this year. Existing sheets stay.
          </p>
          <label className="block text-sm">
            <span className="text-muted">Community slug</span>
            <input
              className={`${fieldInputClass} mt-1`}
              value={communitySlug}
              onChange={(event) => setCommunitySlug(event.target.value)}
              onBlur={() => {
                if (communitySlug.trim()) void refreshCommunityStats();
              }}
              placeholder="eric"
              disabled={running}
              autoComplete="off"
            />
          </label>
          {communityStats ? (
            <p className="text-sm text-muted">
              {communityStats.slug}: {communityStats.seedMemberSheets} seed
              members already entered · {communityStats.seedMembersWithoutSheet}{" "}
              still empty
              {communityStats.optedIn ? "" : " · pick’em is off"}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={running || pageYears.length === 0}
              onClick={() => void runEmptyCommunitySeedMembers()}
            >
              Seed empty community members
            </Button>
            <Button
              type="button"
              variant="bordered"
              disabled={running}
              onClick={() => void refreshCommunityStats()}
            >
              Refresh community stats
            </Button>
          </div>
          <Button
            type="button"
            variant="danger-bordered"
            disabled={running || pageYears.length === 0}
            onClick={() =>
              void (async () => {
                const slugError = tgaCommunitySeedSlugError(communitySlug);
                if (slugError) {
                  setMessage(slugError);
                  return;
                }
                setMessage(null);
                const result = await clearTgaCommunitySeedSheetsAction(
                  communitySlug,
                  year,
                );
                if ("error" in result) {
                  setMessage(result.error);
                  return;
                }
                await refreshCommunityStats();
                setMessage(
                  `Removed ${result.deletedSheets} ${TGA_PUBLIC_LABEL} community sheets from seed members.`,
                );
              })()
            }
          >
            Clear community seed sheets
          </Button>
        </div>

        {message ? (
          <p className="text-sm text-accent" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </AdminTgaGate>
  );
}
