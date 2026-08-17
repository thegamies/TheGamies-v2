"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyInviteButton({
  path,
  label = "Copy invite",
  size = "sm",
}: {
  path: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="bordered"
      size={size}
      onClick={async () => {
        const href =
          typeof window === "undefined"
            ? path
            : `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(href);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
