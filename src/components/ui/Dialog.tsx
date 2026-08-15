"use client";

import { useEffect, useId, type ReactNode } from "react";

export function Dialog({
  open,
  title,
  onClose,
  children,
  className = "w-full max-w-xl",
  tone = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Danger: irreversible destroy (delete event). Title and border use `--danger`. */
  tone?: "default" | "danger";
}) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`overflow-visible border bg-panel p-5 ${
          tone === "danger" ? "border-danger" : "border-line"
        } ${className}`}
      >
        <div className="flex items-start justify-between gap-4">
          <p
            id={headingId}
            className={`font-display text-2xl tracking-wide ${
              tone === "danger" ? "text-danger" : "text-ink"
            }`}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
