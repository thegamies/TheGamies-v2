"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  searchCommunityMembersForAdminAction,
  setCommunityMemberRoleAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import type { CommunityRole } from "@/lib/communities/schema";

export type CommunityHostMemberOption = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: CommunityRole;
};

function applyRole(
  rows: CommunityHostMemberOption[],
  profileId: string,
  role: CommunityRole,
): CommunityHostMemberOption[] {
  return rows.map((row) =>
    row.profileId === profileId ? { ...row, role } : row,
  );
}

export function CommunityHostsForm({
  slug,
  members,
  viewerProfileId,
  hostCount,
}: {
  slug: string;
  members: CommunityHostMemberOption[];
  viewerProfileId: string;
  hostCount: number;
}) {
  const searchId = useId();
  const [roster, setRoster] = useState(members);
  const [membersSnapshot, setMembersSnapshot] = useState(members);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CommunityHostMemberOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [mutating, startMutate] = useTransition();

  if (members !== membersSnapshot) {
    setMembersSnapshot(members);
    setRoster(members);
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const result = await searchCommunityMembersForAdminAction({
          slug,
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
  }, [query, slug]);

  const trimmed = query.trim();
  const visible = trimmed ? hits : roster.filter((m) => m.role === "admin");
  const lastHostLocked = hostCount <= 1;

  function setRole(profileId: string, role: CommunityRole) {
    setMutateError(null);
    startMutate(async () => {
      const data = new FormData();
      data.set("slug", slug);
      data.set("profileId", profileId);
      data.set("role", role);
      const result = await setCommunityMemberRoleAction(null, data);
      if (result?.error) {
        setMutateError(result.error);
        return;
      }
      setHits((prev) => applyRole(prev, profileId, role));
      setRoster((prev) => {
        if (role === "admin") {
          const existing = prev.find((row) => row.profileId === profileId);
          if (existing) return applyRole(prev, profileId, role);
          const hit = hits.find((row) => row.profileId === profileId);
          return hit ? [...prev, { ...hit, role: "admin" }] : prev;
        }
        return prev.filter((row) => row.profileId !== profileId);
      });
    });
  }

  return (
    <div>
      <h3 className="mt-8 font-display text-2xl tracking-wide text-ink">
        Admins
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        People who can manage this community. Current admins are listed by
        default — search to find other members.
      </p>

      <div className="mt-4">
        <label htmlFor={searchId} className="sr-only">
          Search members
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name or @username"
          className="w-full max-w-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted"
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
        <p className="mt-4 text-sm text-muted">No members match that search.</p>
      ) : null}

      {!trimmed && visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No admins yet.</p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {visible.map((member) => {
            const isAdmin = member.role === "admin";
            const isYou = member.profileId === viewerProfileId;
            const cannotRemove = isAdmin && lastHostLocked;
            return (
              <li
                key={member.profileId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonIdentity
                  displayName={member.displayName}
                  username={member.username}
                  avatarUrl={member.avatarUrl}
                  subtitle={
                    <p className="text-sm text-muted">
                      @{member.username}
                      {isYou ? " · You" : null}
                      <span className="text-muted">
                        {" "}
                        · {isAdmin ? "Admin" : "Member"}
                      </span>
                    </p>
                  }
                />
                {cannotRemove ? (
                  <p className="text-sm text-muted">Last admin</p>
                ) : (
                  <Button
                    type="button"
                    variant="bordered"
                    size="sm"
                    disabled={mutating || searching}
                    onClick={() =>
                      setRole(member.profileId, isAdmin ? "member" : "admin")
                    }
                  >
                    {isAdmin ? "Remove admin" : "Make admin"}
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
