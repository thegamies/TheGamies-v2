"use client";

import { useActionState } from "react";
import { unbanCommunityMemberAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";

export type CommunityBanListItem = {
  profileId: string;
  username: string;
  displayName: string;
};

export function CommunityBansSettings({
  slug,
  bans,
}: {
  slug: string;
  bans: CommunityBanListItem[];
}) {
  const [state, formAction, pending] = useActionState(
    unbanCommunityMemberAction,
    null,
  );

  return (
    <div className="mt-10">
      <h3 className="font-display text-2xl tracking-wide text-ink">Banned</h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Banned people cannot rejoin with an invite until you lift the ban.
      </p>

      {state?.error ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}

      {bans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No bans.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {bans.map((ban) => (
            <li
              key={ban.profileId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-ink">{ban.displayName}</p>
                <p className="text-sm text-muted">@{ban.username}</p>
              </div>
              <form action={formAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="profileId" value={ban.profileId} />
                <Button
                  type="submit"
                  variant="bordered"
                  size="sm"
                  disabled={pending}
                >
                  Unban
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
