"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { buildSignInHref, buildSignUpHref } from "@/lib/auth/return-to";

export function LibrarySignInDialog({
  open,
  onClose,
  returnPath,
}: {
  open: boolean;
  onClose: () => void;
  returnPath: string;
}) {
  return (
    <Dialog open={open} title="Save to your library" onClose={onClose}>
      <p className="mt-2 text-sm text-muted">
        Sign in to add games to your library — wishlist, backlog, playing,
        paused, beat, or dropped.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={buildSignInHref({ next: returnPath })} rel="nofollow">
          <Button type="button">Sign in</Button>
        </Link>
        <Link href={buildSignUpHref({ next: returnPath })} rel="nofollow">
          <Button type="button" variant="bordered">
            Create account
          </Button>
        </Link>
      </div>
    </Dialog>
  );
}
