"use client";

import { Button } from "@/components/ui/Button";

export function CopyLinkButton() {
  return (
    <Button
      type="button"
      variant="bordered"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
        } catch {
          // ignore
        }
      }}
    >
      Copy link
    </Button>
  );
}
