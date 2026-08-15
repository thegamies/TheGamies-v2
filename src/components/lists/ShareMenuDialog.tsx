"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function ShareMenuDialog({
  open,
  onClose,
  onShareAsImage,
  onShareWithLink,
  linkDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  onShareAsImage: () => void;
  onShareWithLink: () => void;
  linkDisabled?: boolean;
}) {
  return (
    <Dialog open={open} title="Share" onClose={onClose} className="w-full max-w-md">
      <p className="mt-2 text-sm text-muted">
        Share a poster image, or publish a public page with a link.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          variant="bordered"
          className="w-full justify-start"
          onClick={() => {
            onClose();
            onShareAsImage();
          }}
        >
          Share as image
        </Button>
        <Button
          type="button"
          variant="bordered"
          className="w-full justify-start"
          disabled={linkDisabled}
          onClick={() => {
            onClose();
            onShareWithLink();
          }}
        >
          Share with a link
        </Button>
      </div>
    </Dialog>
  );
}
