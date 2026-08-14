"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { setCommunityMemberRoleAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import type { CommunityRole } from "@/lib/communities/schema";

export type CommunityHostMemberOption = {
  profileId: string;
  username: string;
  displayName: string;
  role: CommunityRole;
};

function memberMatchesQuery(
  member: CommunityHostMemberOption,
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    member.displayName.toLowerCase().includes(needle) ||
    member.username.toLowerCase().includes(needle)
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
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(
    setCommunityMemberRoleAction,
    null,
  );

  const trimmed = query.trim();
  const visible = useMemo(() => {
    if (trimmed) {
      return members.filter((m) => memberMatchesQuery(m, trimmed));
    }
    return members.filter((m) => m.role === "admin");
  }, [members, trimmed]);

  const lastHostLocked = hostCount <= 1;

  return (
    <div>
      <h3 className="mt-8 font-display text-2xl tracking-wide text-ink">
        Admins
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        People who can manage this community. Current admins are listed by
        default — search to find other members.
      </p>

      {members.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No members yet.</p>
      ) : (
        <>
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

          {trimmed && visible.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No members match that search.
            </p>
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
                    <div>
                      <p className="text-ink">{member.displayName}</p>
                      <p className="text-sm text-muted">
                        @{member.username}
                        {isYou ? " · You" : null}
                        <span className="text-muted">
                          {" "}
                          · {isAdmin ? "Admin" : "Member"}
                        </span>
                      </p>
                    </div>
                    {cannotRemove ? (
                      <p className="text-sm text-muted">Last admin</p>
                    ) : (
                      <form action={formAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="profileId"
                          value={member.profileId}
                        />
                        <input
                          type="hidden"
                          name="role"
                          value={isAdmin ? "member" : "admin"}
                        />
                        <Button
                          type="submit"
                          variant="bordered"
                          disabled={pending}
                          className="text-sm"
                        >
                          {isAdmin ? "Remove admin" : "Make admin"}
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      )}

      {state?.error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
