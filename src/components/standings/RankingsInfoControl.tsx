"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

const RANKINGS_INFO_COPY = [
  "Signed-in Game of the Year lists feed these boards. Rankings use points from list positions, and tied games share a place.",
  "Some years and category boards stay unpublished until enough lists have been saved.",
] as const;

export function RankingsInfoControl({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="About rankings"
        onClick={() => setOpen(true)}
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-ink ${className ?? ""}`}
      >
        i
      </button>
      <Dialog
        open={open}
        title="About rankings"
        onClose={() => setOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="mt-4 space-y-3 text-sm text-muted">
          {RANKINGS_INFO_COPY.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Dialog>
    </>
  );
}
