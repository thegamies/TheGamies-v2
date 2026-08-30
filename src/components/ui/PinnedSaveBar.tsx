import type { ReactNode } from "react";

export function PinnedSaveBar({
  children,
  message = "Unsaved changes",
  className = "fixed inset-x-0 bottom-0 z-40",
}: {
  children: ReactNode;
  message?: ReactNode;
  /** Override positioning — gallery fixtures use absolute inside a frame. */
  className?: string;
}) {
  return (
    <div
      className={`${className} border-t border-line bg-panel pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
    >
      <div className="mx-auto flex max-w-[var(--page-max)] items-center justify-between gap-4 px-[var(--gutter)] py-3">
        <p className="min-w-0 text-sm text-muted" role="status">
          {message}
        </p>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
