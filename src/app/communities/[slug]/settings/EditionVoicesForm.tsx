"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { setEditionVoiceAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";

export type EditionVoiceMemberOption = {
  profileId: string;
  username: string;
  displayName: string;
  /** Internal role — UI says Host, never admin. */
  role: "admin" | "member";
  isVoice: boolean;
};

function memberMatchesQuery(
  member: EditionVoiceMemberOption,
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    member.displayName.toLowerCase().includes(needle) ||
    member.username.toLowerCase().includes(needle)
  );
}

function roleLabel(member: EditionVoiceMemberOption): string {
  if (member.isVoice || member.role === "admin") return "Host";
  return "Member";
}

export function EditionVoicesForm({
  slug,
  year,
  status,
  members,
  locked,
}: {
  slug: string;
  year: number;
  status: string;
  members: EditionVoiceMemberOption[];
  locked: boolean;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(
    setEditionVoiceAction,
    null,
  );

  const trimmed = query.trim();
  const visible = useMemo(() => {
    if (trimmed) {
      return members.filter((m) => memberMatchesQuery(m, trimmed));
    }
    // Default: community hosts and current Hosts — search to reach everyone else.
    return members.filter((m) => m.role === "admin" || m.isVoice);
  }, [members, trimmed]);

  const defaultEmpty =
    !trimmed && visible.length === 0 && members.length > 0;

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">Hosts</h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Designate Hosts for the {year} event ({status}). Current Hosts are
        listed by default — search to find other members. Roster locks when
        results publish.
      </p>

      {locked ? (
        <p className="mt-4 text-sm text-muted">
          Hosts for this event are locked.
        </p>
      ) : null}

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

          {defaultEmpty ? (
            <p className="mt-4 text-sm text-muted">
              No Hosts designated yet. Search members to add one.
            </p>
          ) : null}

          {trimmed && visible.length === 0 ? (
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
                  {locked ? (
                    <p className="text-sm text-muted">{roleLabel(member)}</p>
                  ) : (
                    <form action={formAction}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="year" value={String(year)} />
                      <input
                        type="hidden"
                        name="profileId"
                        value={member.profileId}
                      />
                      <input
                        type="hidden"
                        name="isVoice"
                        value={member.isVoice ? "0" : "1"}
                      />
                      <Button
                        type="submit"
                        variant="bordered"
                        disabled={pending}
                        className="text-sm"
                      >
                        {member.isVoice ? "Remove Host" : "Make Host"}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
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
