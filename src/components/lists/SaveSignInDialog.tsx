"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { buildListSignInHref } from "@/lib/lists/auth-intent";

export function SaveSignInDialog({
  open,
  onClose,
  returnPath,
}: {
  open: boolean;
  onClose: () => void;
  /** Current create editor path (draft restored via cookie after auth). */
  returnPath: string;
}) {
  return (
    <Dialog open={open} title="Save your list" onClose={onClose}>
      <p className="mt-2 text-sm text-muted">
        Sign in to save this list to your profile. Saved GOTY lists also count
        toward the community rankings.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={buildListSignInHref(returnPath, "save")}>
          <Button type="button">Sign in &amp; save</Button>
        </Link>
        <Button type="button" variant="bordered" onClick={onClose}>
          Keep editing
        </Button>
      </div>
    </Dialog>
  );
}
