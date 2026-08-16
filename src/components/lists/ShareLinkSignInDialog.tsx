"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { buildSignUpHref } from "@/lib/auth/return-to";
import { buildListSignInHref } from "@/lib/lists/auth-intent";

export function ShareLinkSignInDialog({
  open,
  onClose,
  onShareAsImage,
  returnPath,
}: {
  open: boolean;
  onClose: () => void;
  onShareAsImage: () => void;
  returnPath: string;
}) {
  return (
    <Dialog open={open} title="Share with a link" onClose={onClose}>
      <p className="mt-2 text-sm text-muted">
        Sign in to save and publish your list so people can revisit it.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={buildListSignInHref(returnPath, "share")}>
          <Button type="button">Sign in &amp; share</Button>
        </Link>
        <Link href={buildSignUpHref({ next: returnPath, intent: "share" })}>
          <Button type="button" variant="bordered">
            Create account &amp; share
          </Button>
        </Link>
        <Button
          type="button"
          variant="bordered"
          onClick={() => {
            onClose();
            onShareAsImage();
          }}
        >
          Share as image instead
        </Button>
        <Button type="button" variant="quiet" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
