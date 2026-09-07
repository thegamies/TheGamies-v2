import type { ReactNode } from "react";
import type { LibraryStatus } from "@/lib/activity/kinds";

const pathClass = "stroke-current fill-none";

function IconFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`size-5 shrink-0 ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

export function LibraryStatusIcon({
  status,
  className,
}: {
  status: LibraryStatus;
  className?: string;
}) {
  switch (status) {
    case "wishlist":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            strokeLinejoin="round"
            d="M7 4.5h10v15l-5-3.2-5 3.2z"
          />
        </IconFrame>
      );
    case "backlog":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            strokeLinecap="square"
            d="M5 8h14M5 12h14M5 16h10"
          />
        </IconFrame>
      );
    case "playing":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            strokeLinejoin="round"
            d="M8 6.5v11l10-5.5z"
          />
        </IconFrame>
      );
    case "paused":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            d="M8 6.5h2.5v11H8zM13.5 6.5H16v11h-2.5z"
          />
        </IconFrame>
      );
    case "beat":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M5.5 12.5 10 17l8.5-10"
          />
        </IconFrame>
      );
    case "dropped":
      return (
        <IconFrame className={className}>
          <path
            className={pathClass}
            strokeWidth="1.5"
            strokeLinecap="square"
            d="M7 7l10 10M17 7 7 17"
          />
        </IconFrame>
      );
  }
}
