"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { fieldInputClass } from "@/components/ui/controls";
import {
  searchSiteOperatorsAction,
  setSiteOperatorAction,
} from "./actions";

export type SiteOperatorOption = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isSiteAdmin: boolean;
};

function applyFlag(
  rows: SiteOperatorOption[],
  profileId: string,
  isSiteAdmin: boolean,
): SiteOperatorOption[] {
  return rows.map((row) =>
    row.profileId === profileId ? { ...row, isSiteAdmin } : row,
  );
}

export function SiteOperatorsForm({
  operators,
  viewerProfileId,
}: {
  operators: SiteOperatorOption[];
  viewerProfileId: string;
}) {
  const searchId = useId();
  const [roster, setRoster] = useState(operators);
  const [snapshot, setSnapshot] = useState(operators);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SiteOperatorOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [mutating, startMutate] = useTransition();

  if (operators !== snapshot) {
    setSnapshot(operators);
    setRoster(operators);
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const result = await searchSiteOperatorsAction({ q });
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
  }, [query]);

  const trimmed = query.trim();
  const visible = trimmed ? hits : roster;
  const lastLocked = roster.filter((row) => row.isSiteAdmin).length <= 1;

  function setFlag(profileId: string, isSiteAdmin: boolean) {
    setMutateError(null);
    startMutate(async () => {
      const result = await setSiteOperatorAction({ profileId, isSiteAdmin });
      if (result && "error" in result && result.error) {
        setMutateError(result.error);
        return;
      }
      setHits((prev) => applyFlag(prev, profileId, isSiteAdmin));
      setRoster((prev) => {
        if (isSiteAdmin) {
          const existing = prev.find((row) => row.profileId === profileId);
          if (existing) return applyFlag(prev, profileId, true);
          const hit = hits.find((row) => row.profileId === profileId);
          return hit ? [...prev, { ...hit, isSiteAdmin: true }] : prev;
        }
        return prev.filter((row) => row.profileId !== profileId);
      });
    });
  }

  return (
    <div>
      <p className="max-w-xl text-sm text-muted">
        Current operators are listed by default. Search to find someone else.
        Community admins are separate.
      </p>

      <div className="mt-4">
        <label htmlFor={searchId} className="sr-only">
          Search people
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or @username"
          className={`max-w-md ${fieldInputClass}`}
          autoComplete="off"
        />
      </div>

      {searchError ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {searchError}
        </p>
      ) : null}
      {mutateError ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {mutateError}
        </p>
      ) : null}

      {trimmed && !searching && visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No people match that search.</p>
      ) : null}

      {!trimmed && visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No site operators yet.</p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="mt-4 max-w-xl divide-y divide-line border-y border-line">
          {visible.map((person) => {
            const isYou = person.profileId === viewerProfileId;
            const cannotRemove = person.isSiteAdmin && lastLocked;
            return (
              <li
                key={person.profileId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonIdentity
                  displayName={person.displayName}
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  subtitle={
                    <p className="text-sm text-muted">
                      @{person.username}
                      {isYou ? " · You" : null}
                      {person.isSiteAdmin ? " · Operator" : null}
                    </p>
                  }
                />
                {cannotRemove ? (
                  <p className="text-sm text-muted">Last operator</p>
                ) : (
                  <Button
                    type="button"
                    variant="bordered"
                    size="sm"
                    disabled={mutating || searching}
                    onClick={() => setFlag(person.profileId, !person.isSiteAdmin)}
                  >
                    {person.isSiteAdmin ? "Remove" : "Make operator"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
