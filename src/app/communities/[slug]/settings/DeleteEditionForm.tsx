"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fieldInputClass } from "@/components/ui/controls";
import { deleteCommunityEditionAction } from "../../actions";
import { editionDeleteConfirmMatches } from "@/lib/communities/edition-status";

export function DeleteEditionForm({
  slug,
  year,
}: {
  slug: string;
  year: number;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCommunityEditionAction,
    null,
  );
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = editionDeleteConfirmMatches(year, typed);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setTyped("");
  }

  return (
    <div className="mt-10 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-danger">
        Delete event
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Removes this year’s vote, ballots, and results. This cannot be undone.
      </p>
      <Button
        type="button"
        variant="danger-bordered"
        className="mt-4"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
      >
        Delete event
      </Button>

      <Dialog
        open={open}
        title="Delete event"
        tone="danger"
        onClose={closeDialog}
        className="w-full max-w-md"
      >
        <p className="mt-2 text-sm text-muted">
          This removes the {year} event, including ballots and results. Type{" "}
          <span className="font-semibold text-danger">{year}</span> to confirm.
        </p>
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="year" value={year} />
          <label className="block text-sm text-muted">
            Year
            <input
              type="text"
              name="confirmYear"
              inputMode="numeric"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className={fieldInputClass}
              aria-label={`Type ${year} to confirm`}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="bordered"
              disabled={pending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={pending || !matches}>
              {pending ? "Deleting…" : "Delete event"}
            </Button>
          </div>
          {state?.error ? (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </div>
  );
}
