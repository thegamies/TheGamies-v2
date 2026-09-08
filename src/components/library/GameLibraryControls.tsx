"use client";

import { useState, useTransition } from "react";
import {
  clearLibraryEntryAction,
  setLibraryStatusAction,
} from "@/app/library/actions";
import { LibrarySignInDialog } from "@/components/library/LibrarySignInDialog";
import { LibraryStatusIcon } from "@/components/library/LibraryStatusIcon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  formatFollowLibraryCounts,
  type LibraryStatus,
  type LibraryVisibility,
} from "@/lib/activity/kinds";

export function GameLibraryControls({
  gameId,
  gameSlug,
  signedIn,
  initialStatus,
  initialVisibility,
  followCounts,
}: {
  gameId: string;
  gameSlug: string;
  signedIn: boolean;
  initialStatus: LibraryStatus | null;
  initialVisibility: LibraryVisibility;
  followCounts?: Partial<Record<LibraryStatus, number>> | null;
}) {
  const [status, setStatus] = useState<LibraryStatus | null>(initialStatus);
  const [visibility, setVisibility] =
    useState<LibraryVisibility>(initialVisibility);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const followLine = followCounts
    ? formatFollowLibraryCounts(followCounts)
    : null;

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    startTransition(async () => {
      setMessage(null);
      const result = await fn();
      if (result.error) setMessage(result.error);
    });
  }

  function openPicker() {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    setPickerOpen(true);
  }

  function choose(next: LibraryStatus) {
    setStatus(next);
    setPickerOpen(false);
    run(() =>
      setLibraryStatusAction({
        gameId,
        gameSlug,
        status: next,
        visibility,
      }),
    );
  }

  function togglePrivate() {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    const next = visibility === "private" ? "public" : "private";
    setVisibility(next);
    if (!status) return;
    run(() =>
      setLibraryStatusAction({
        gameId,
        gameSlug,
        status,
        visibility: next,
      }),
    );
  }

  function remove() {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    setStatus(null);
    setPickerOpen(false);
    run(() => clearLibraryEntryAction({ gameId, gameSlug }));
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={status ? "accent-bordered" : "bordered"}
        disabled={pending}
        onClick={openPicker}
        className="w-full gap-2"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
      >
        {status ? (
          <>
            <LibraryStatusIcon status={status} />
            {LIBRARY_STATUS_LABELS[status]}
          </>
        ) : (
          "Add to library"
        )}
      </Button>
      {status ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={visibility === "private"}
            disabled={pending}
            onChange={togglePrivate}
            className="size-4 accent-[var(--accent)]"
          />
          Only I can see this
        </label>
      ) : null}
      {followLine ? <p className="text-sm text-muted">{followLine}</p> : null}
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
      <Dialog
        open={pickerOpen}
        title={status ? "Library status" : "Add to library"}
        onClose={() => setPickerOpen(false)}
        className="w-full max-w-sm"
      >
        <ul className="mt-4 space-y-1">
          {LIBRARY_STATUSES.map((value) => (
            <li key={value}>
              <button
                type="button"
                disabled={pending}
                aria-pressed={status === value}
                onClick={() => choose(value)}
                className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm transition-colors ${
                  status === value
                    ? "border-accent text-accent"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                <LibraryStatusIcon status={value} />
                {LIBRARY_STATUS_LABELS[value]}
              </button>
            </li>
          ))}
        </ul>
        {status ? (
          <section className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="block w-full text-left text-sm font-semibold tracking-wide text-danger hover:opacity-90 disabled:opacity-40"
            >
              Remove from library
            </button>
          </section>
        ) : null}
      </Dialog>
      <LibrarySignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        returnPath={`/games/${gameSlug}`}
      />
    </div>
  );
}
