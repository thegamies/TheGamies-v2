"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  searchEditionHostMembersAction,
  setEditionVoiceAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { communitySettingsHref } from "@/lib/communities/community-settings-href";
import Link from "next/link";

export type EditionVoiceMemberOption = {
  profileId: string;
  username: string;
  displayName: string;
  /** Internal role — UI says Host, never admin. */
  role: "admin" | "member";
  isVoice: boolean;
};

function roleLabel(member: EditionVoiceMemberOption): string {
  if (member.isVoice || member.role === "admin") return "Host";
  return "Member";
}

function applyVoiceFlag(
  rows: EditionVoiceMemberOption[],
  profileId: string,
  isVoice: boolean,
): EditionVoiceMemberOption[] {
  return rows.map((row) =>
    row.profileId === profileId ? { ...row, isVoice } : row,
  );
}

export function EditionVoicesForm({
  slug,
  year,
  status,
  members,
  locked: _locked,
}: {
  slug: string;
  year: number;
  status: string;
  members: EditionVoiceMemberOption[];
  locked: boolean;
}) {
  const searchId = useId();
  const [roster, setRoster] = useState(members);
  const [membersSnapshot, setMembersSnapshot] = useState(members);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<EditionVoiceMemberOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [mutating, startMutate] = useTransition();

  // Reset optimistic roster when the server list identity changes (nav / refresh).
  if (members !== membersSnapshot) {
    setMembersSnapshot(members);
    setRoster(members);
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const result = await searchEditionHostMembersAction({
          slug,
          year,
          q,
        });
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
  }, [query, slug, year]);

  const trimmed = query.trim();
  const visible = trimmed ? hits : roster;
  const defaultEmpty = !trimmed && visible.length === 0;

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 1) {
      setHits([]);
      setSearchError(null);
    }
  }

  function toggleVoice(member: EditionVoiceMemberOption) {
    const nextVoice = !member.isVoice;
    const previousRoster = roster;
    const previousHits = hits;
    setMutateError(null);
    setRoster((rows) => {
      const updated = applyVoiceFlag(rows, member.profileId, nextVoice);
      if (nextVoice) {
        return updated.some((row) => row.profileId === member.profileId)
          ? updated
          : [...updated, { ...member, isVoice: true }];
      }
      if (member.role === "admin") return updated;
      return updated.filter((row) => row.profileId !== member.profileId);
    });
    setHits((rows) => applyVoiceFlag(rows, member.profileId, nextVoice));

    startMutate(async () => {
      const formData = new FormData();
      formData.set("slug", slug);
      formData.set("year", String(year));
      formData.set("profileId", member.profileId);
      formData.set("isVoice", nextVoice ? "1" : "0");
      const result = await setEditionVoiceAction(null, formData);
      if (result?.error) {
        setRoster(previousRoster);
        setHits(previousHits);
        setMutateError(result.error);
      }
    });
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">Hosts</h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Designate Hosts for the {year} event ({status}). This year only — it
        does not promote or retire them for the community.{" "}
        <Link
          href={communitySettingsHref(slug, { tab: "hosts" })}
          className="underline underline-offset-2"
        >
          Community Hosts
        </Link>
        .
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

      {defaultEmpty ? (
        <p className="mt-4 text-sm text-muted">
          No Hosts designated yet. Search members to add one.
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
                <p className="text-sm text-muted">
                  @{member.username}
                  <span className="text-muted"> · {roleLabel(member)}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="bordered"
                disabled={mutating}
                className="text-sm"
                onClick={() => toggleVoice(member)}
              >
                {member.isVoice ? "Remove Host" : "Make Host"}
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
