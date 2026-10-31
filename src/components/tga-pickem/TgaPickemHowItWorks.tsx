"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export const TGA_PICKEM_HOW_IT_WORKS =
  "Predict the winner of every award. Earn 1 point for each correct pick. If there’s a tie, your World Premiere prediction decides the winner. Guess how many will be revealed during the show.";

/** How it works control while picks are soon or open. Hidden after lock. */
export function TgaPickemHowItWorks({
  className = "mt-4",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={className}>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => setOpen(true)}
        >
          How it works
        </Button>
      </div>
      <Dialog
        open={open}
        title="How it works"
        onClose={() => setOpen(false)}
        className="w-full max-w-md"
      >
        <p className="mt-3 text-sm text-muted">{TGA_PICKEM_HOW_IT_WORKS}</p>
      </Dialog>
    </>
  );
}
