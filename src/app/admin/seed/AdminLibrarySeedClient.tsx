"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  clearSeedLibrariesAction,
  seedLibrariesAction,
} from "./actions";

export function AdminLibrarySeedClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-16 space-y-5 border-t border-line pt-10">
      <h2 className="font-display text-3xl tracking-wide text-ink">
        Seed libraries
      </h2>
      <p className="max-w-2xl text-muted">
        Fill Wishlist, Backlog, Playing, and Beat shelves on seed accounts so Games
        trending has enough people. Playing uses popular games that came out
        recently — the same current titles across many seed accounts — with
        those events stamped in the last day. Seed accounts stay out of People
        search and cannot be followed, except by site operators and on local
        or preview builds.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              const result = await seedLibrariesAction();
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Filled ${result.entries} library games across ${result.profiles} seed accounts.`,
              );
            });
          }}
        >
          Fill seed libraries
        </Button>
        <Button
          type="button"
          variant="bordered"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              const result = await clearSeedLibrariesAction();
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage(
                `Removed ${result.entries} library games from ${result.profiles} seed accounts.`,
              );
            });
          }}
        >
          Clear seed libraries
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
