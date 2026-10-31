import type { ReactNode } from "react";

export function PinnedSaveBar({
  children,
  message = "Unsaved changes",
  className = "fixed inset-x-0 bottom-[var(--site-ad-bar,0px)] z-40",
  /** When false, skip home-indicator padding (bar already sits above mobile chrome). */
  safeArea = true,
}: {
  children: ReactNode;
  message?: ReactNode;
  /** Override positioning — gallery fixtures use absolute inside a frame. */
  className?: string;
  safeArea?: boolean;
}) {
  return (
    <div
      className={`${className} border-t border-line bg-panel ${
        safeArea
          ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          : "pb-3"
      }`}
    >
      <div className="mx-auto flex max-w-[var(--page-max)] items-center justify-between gap-3 px-[var(--gutter)] py-3 sm:gap-4">
        <div className="min-w-0 flex-1 text-sm text-muted" role="status">
          {message}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
