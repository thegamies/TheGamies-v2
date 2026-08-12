"use client";

import { useActionState } from "react";
import { setEditionVoiceAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";

export type EditionVoiceMemberOption = {
  profileId: string;
  username: string;
  displayName: string;
  isVoice: boolean;
};

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
  const [state, formAction, pending] = useActionState(
    setEditionVoiceAction,
    null,
  );

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">Voices</h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Designate Voices for the {year} edition ({status}). This roster is
        year-specific and locks when results publish.
      </p>

      {locked ? (
        <p className="mt-4 text-sm text-muted">
          Voices for this edition are locked.
        </p>
      ) : null}

      {members.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No members yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {members.map((member) => (
            <li
              key={member.profileId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-ink">{member.displayName}</p>
                <p className="text-sm text-muted">@{member.username}</p>
              </div>
              {locked ? (
                <p className="text-sm text-muted">
                  {member.isVoice ? "Voice" : "Member"}
                </p>
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
                    {member.isVoice ? "Remove Voice" : "Make Voice"}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {state?.error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
