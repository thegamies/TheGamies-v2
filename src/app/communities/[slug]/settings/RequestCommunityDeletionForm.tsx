"use client";

import { useActionState, useState } from "react";
import { requestCommunityDeletionAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fieldInputClass } from "@/components/ui/controls";
import { communityDeletionRequestConfirmMatches } from "@/lib/communities/rules";

export function RequestCommunityDeletionForm({
  slug,
  name,
  pendingRequest,
}: {
  slug: string;
  name: string;
  pendingRequest: { requestedAt: Date } | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestCommunityDeletionAction,
    null,
  );
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = communityDeletionRequestConfirmMatches(name, typed);
  const requestPending =
    pendingRequest != null || (state != null && "ok" in state && state.ok);
  const dialogOpen = open && !requestPending;

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setTyped("");
  }

  return (
    <div className="mt-10 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-danger">
        Request deletion
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Ask the site team to remove this community. Members, events, and results
        stay until the request is handled.
      </p>

      {requestPending ? (
        <p className="mt-4 text-sm text-muted" role="status">
          {state && "ok" in state && state.alreadyPending
            ? "A deletion request is already pending for this community."
            : "Deletion request submitted. The community stays available until the request is handled."}
        </p>
      ) : (
        <Button
          type="button"
          variant="danger-bordered"
          className="mt-4"
          onClick={() => {
            setTyped("");
            setOpen(true);
          }}
        >
          Request deletion
        </Button>
      )}

      <Dialog
        open={dialogOpen}
        title="Request deletion"
        tone="danger"
        onClose={closeDialog}
        className="w-full max-w-md"
      >
        <p className="mt-2 text-sm text-muted">
          This sends a request to remove {name}. Type{" "}
          <span className="font-semibold text-danger">{name}</span> to confirm.
        </p>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <label className="block text-sm text-muted">
            Community name
            <input
              name="confirmName"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className={fieldInputClass}
            />
          </label>
          {state && "error" in state && state.error ? (
            <p className="text-sm text-accent" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={!matches || pending}
            >
              {pending ? "Submitting…" : "Submit request"}
            </Button>
            <Button
              type="button"
              variant="quiet"
              disabled={pending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
