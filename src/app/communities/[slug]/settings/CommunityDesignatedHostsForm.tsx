"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  promoteCommunityHostAction,
  retireCommunityHostAction,
  searchCommunityMembersForHostAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";

export type CommunityDesignatedHostOption = {
  profileId: string;
  username: string;
  displayName: string;
  isHost: boolean;
};

function applyHostFlag(
  rows: CommunityDesignatedHostOption[],
  profileId: string,
  isHost: boolean,
): CommunityDesignatedHostOption[] {
  return rows.map((row) =>
    row.profileId === profileId ? { ...row, isHost } : row,
  );
}

export function CommunityDesignatedHostsForm({
  slug,
  hosts,
}: {
  slug: string;
  hosts: CommunityDesignatedHostOption[];
}) {
  const searchId = useId();
  const [roster, setRoster] = useState(hosts);
  const [hostsSnapshot, setHostsSnapshot] = useState(hosts);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CommunityDesignatedHostOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [mutating, startMutate] = useTransition();

  if (hosts !== hostsSnapshot) {
    setHostsSnapshot(hosts);
    setRoster(hosts);
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const result = await searchCommunityMembersForHostAction({ slug, q });
        if ("error" in result) {
          setHits([]);
          setSearchError(result.error);
          return;
        }
        setSearchError(null);
        setHits(result.results);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, slug]);

  const trimmed = query.trim();
  const visible = trimmed ? hits : roster;

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 1) {
      setHits([]);
      setSearchError(null);
    }
  }

  function toggleHost(member: CommunityDesignatedHostOption) {
    const nextHost = !member.isHost;
    const previousRoster = roster;
    const previousHits = hits;
    setMutateError(null);
    setRoster((rows) => {
      const updated = applyHostFlag(rows, member.profileId, nextHost);
      if (nextHost) {
        return updated.some((row) => row.profileId === member.profileId)
          ? updated
          : [...updated, { ...member, isHost: true }];
      }
      return updated.filter((row) => row.profileId !== member.profileId);
    });
    setHits((rows) => applyHostFlag(rows, member.profileId, nextHost));

    startMutate(async () => {
      const formData = new FormData();
      formData.set("slug", slug);
      formData.set("profileId", member.profileId);
      const result = nextHost
        ? await promoteCommunityHostAction(null, formData)
        : await retireCommunityHostAction(null, formData);
      if (result?.error) {
        setRoster(previousRoster);
        setHits(previousHits);
        setMutateError(result.error);
      }
    });
  }

  return (
    <div className="mt-8">
      <h3 className="font-display text-2xl tracking-wide text-ink">Hosts</h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Promote members to the community Hosts roster. Open events pick them up.
        Closed years keep their own list until you edit that year.
      </p>

      <div className="mt-4">
        <label htmlFor={searchId} className="sr-only">
          Search members
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search members by name or @username"
          className="w-full max-w-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted"
          autoComplete="off"
        />
      </div>

      {searching ? (
        <p className="mt-4 text-sm text-muted">Searching…</p>
      ) : null}

      {!trimmed && visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No Hosts yet. Search members to promote one.
        </p>
      ) : null}

      {trimmed && !searching && visible.length === 0 && !searchError ? (
        <p className="mt-4 text-sm text-muted">No members match that search.</p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {visible.map((member) => (
            <li
              key={member.profileId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-ink">{member.displayName}</p>
                <p className="text-sm text-muted">@{member.username}</p>
              </div>
              <Button
                type="button"
                variant="bordered"
                disabled={mutating}
                className="text-sm"
                onClick={() => toggleHost(member)}
              >
                {member.isHost ? "Retire" : "Promote"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {searchError ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {searchError}
        </p>
      ) : null}
      {mutateError ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {mutateError}
        </p>
      ) : null}
    </div>
  );
}
