"use client";

import { useActionState, useState } from "react";
import {
  banCommunityMemberAction,
  removeCommunityMemberAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function MemberAdminActions({
  slug,
  profileId,
  displayName,
  isYou,
  isLastAdmin,
}: {
  slug: string;
  profileId: string;
  displayName: string;
  isYou: boolean;
  isLastAdmin: boolean;
}) {
  const [removeState, removeAction, removePending] = useActionState(
    removeCommunityMemberAction,
    null,
  );
  const [banState, banAction, banPending] = useActionState(
    banCommunityMemberAction,
    null,
  );
  const [removeOpen, setRemoveOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);

  if (isYou) return null;
  if (isLastAdmin) {
    return <p className="text-sm text-muted">Last admin</p>;
  }

  const pending = removePending || banPending;
  const error = removeState?.error ?? banState?.error;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? (
        <p className="w-full text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="bordered"
        size="sm"
        disabled={pending}
        onClick={() => setRemoveOpen(true)}
      >
        Remove
      </Button>
      <Button
        type="button"
        variant="danger-bordered"
        size="sm"
        disabled={pending}
        onClick={() => setBanOpen(true)}
      >
        Ban
      </Button>

      <Dialog
        open={removeOpen}
        title="Remove member"
        onClose={() => !pending && setRemoveOpen(false)}
        className="w-full max-w-md"
      >
        <p className="mt-2 text-sm text-muted">
          Remove {displayName} from this community? They can rejoin with an
          invite.
        </p>
        <form action={removeAction} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="profileId" value={profileId} />
          <Button type="submit" variant="bordered" disabled={pending}>
            {removePending ? "Removing…" : "Remove"}
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            onClick={() => setRemoveOpen(false)}
          >
            Cancel
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={banOpen}
        title="Ban member"
        tone="danger"
        onClose={() => !pending && setBanOpen(false)}
        className="w-full max-w-md"
      >
        <p className="mt-2 text-sm text-muted">
          Ban {displayName}? They leave the community and cannot rejoin with an
          invite until an admin lifts the ban.
        </p>
        <form action={banAction} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="profileId" value={profileId} />
          <Button type="submit" variant="danger" disabled={pending}>
            {banPending ? "Banning…" : "Ban"}
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            onClick={() => setBanOpen(false)}
          >
            Cancel
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
