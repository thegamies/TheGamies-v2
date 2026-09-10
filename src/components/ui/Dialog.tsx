"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  open,
  title,
  onClose,
  children,
  className,
  tone = "default",
  placement = "modal",
  description,
  onBack,
  backLabel = "Back",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Danger: irreversible destroy (delete event). Title and border use `--danger`. */
  tone?: "default" | "danger";
  /**
   * `modal` — short dialogs; page may scroll behind.
   * `contained` — centered, capped to the viewport, sticky header, body scrolls.
   */
  placement?: "modal" | "contained";
  description?: ReactNode;
  /** Optional top-of-dialog back control (e.g. return to a previous sheet). */
  onBack?: () => void;
  backLabel?: string;
}) {
  const headingId = useId();
  const [mounted, setMounted] = useState(false);
  const surfaceClass =
    className ??
    (placement === "contained" ? "w-full max-w-3xl" : "w-full max-w-xl");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const borderClass = tone === "danger" ? "border-danger" : "border-line";
  const titleClass = tone === "danger" ? "text-danger" : "text-ink";

  const heading = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 text-sm text-muted transition-colors hover:text-ink"
          >
            ← {backLabel}
          </button>
        ) : null}
        <p
          id={headingId}
          className={`font-display text-2xl tracking-wide ${titleClass}`}
        >
          {title}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 p-1 text-muted transition-colors hover:text-ink"
      >
        ✕
      </button>
    </div>
  );

  const overlay =
    placement === "contained" ? (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className={`flex max-h-[min(92dvh,48rem)] w-full flex-col overflow-hidden border bg-panel ${borderClass} ${surfaceClass}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 px-5 pt-5 pb-3">
            {heading}
            {description ? (
              <div className="mt-2 text-sm text-muted">{description}</div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {children}
          </div>
        </div>
      </div>
    ) : (
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
          className={`overflow-visible border bg-panel p-5 ${borderClass} ${surfaceClass}`}
        >
          {heading}
          {description ? (
            <div className="mt-2 text-sm text-muted">{description}</div>
          ) : null}
          {children}
        </div>
      </div>
    );

  return createPortal(overlay, document.body);
}
