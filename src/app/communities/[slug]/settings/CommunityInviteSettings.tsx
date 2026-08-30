"use client";

import { useActionState, useState } from "react";
import {
  rotateCommunityInviteCodeAction,
  setCommunityOpenInvitesAction,
} from "@/app/communities/actions";
import { CopyInviteButton } from "@/components/communities/CopyInviteButton";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { inviteJoinPath } from "@/lib/communities/invite-code";

export function CommunityInviteSettings({
  slug,
  inviteCode,
  openInvites,
}: {
  slug: string;
  inviteCode: string;
  openInvites: boolean;
}) {
  const [rotateState, rotateAction, rotatePending] = useActionState(
    rotateCommunityInviteCodeAction,
    null,
  );
  const [openState, openAction, openPending] = useActionState(
    setCommunityOpenInvitesAction,
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invitePath = inviteJoinPath(inviteCode);
  const error = rotateState?.error ?? openState?.error ?? null;

  return (
    <div className="mt-6 max-w-xl space-y-8">
      <p className="text-sm text-muted">
        People join this community with an invite link. Generating a new code
        retires the current one.
      </p>

      <div>
        <h3 className="font-display text-2xl tracking-wide text-ink">
          Invite link
        </h3>
        <p className="mt-2 break-all font-mono text-sm text-ink">{invitePath}</p>
        <p className="mt-1 text-sm text-muted">Code {inviteCode}</p>
        <div className="mt-4">
          <CopyInviteButton path={invitePath} label="Copy invite link" size="md" />
        </div>
      </div>

      <div>
        <h3 className="font-display text-2xl tracking-wide text-ink">
          New code
        </h3>
        <p className="mt-2 text-sm text-muted">
          Anyone still holding the old link will not be able to join.
        </p>
        <Button
          type="button"
          variant="bordered"
          className="mt-4"
          disabled={rotatePending}
          onClick={() => setConfirmOpen(true)}
        >
          Generate new code
        </Button>
        <Dialog
          open={confirmOpen}
          title="Generate a new invite?"
          onClose={() => setConfirmOpen(false)}
          className="w-full max-w-md"
        >
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The current invite will stop working. Share the new link with
            people you want to join.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form
              action={async (formData) => {
                await rotateAction(formData);
                setConfirmOpen(false);
              }}
            >
              <input type="hidden" name="slug" value={slug} />
              <Button type="submit" variant="bordered" disabled={rotatePending}>
                {rotatePending ? "Generating…" : "Generate new code"}
              </Button>
            </form>
            <Button
              type="button"
              variant="bordered"
              disabled={rotatePending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Dialog>
      </div>

      <form action={openAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <input
          type="hidden"
          name="enabled"
          value={openInvites ? "false" : "true"}
        />
        <h3 className="font-display text-2xl tracking-wide text-ink">
          Open invites
        </h3>
        <p className="text-sm text-ink">
          Open invites are {openInvites ? "on" : "off"}. Admins can always copy
          the invite from the header. When open invites are on, members can too.
        </p>
        <Button type="submit" variant="bordered" disabled={openPending}>
          {openPending
            ? "Saving…"
            : openInvites
              ? "Turn open invites off"
              : "Turn open invites on"}
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
