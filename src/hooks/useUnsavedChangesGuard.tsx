"use client";

import { useCallback, useEffect, useRef } from "react";
import { useNavigationGuard } from "nextjs-nav-guard";
import { Button } from "@/components/ui/Button";

/**
 * App Router leave guard via nextjs-nav-guard.
 * Uses an in-app dialog — Cursor’s browser makes window.confirm() non-blocking
 * (`Native dialog overrides installed`), so native confirms never appear there.
 *
 * Requires `<NavigationGuardProvider>` in the root layout (see AppProviders).
 */
export function useUnsavedChangesGuard(enabled: boolean) {
  const enabledRef = useRef(enabled);
  const bypassRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) bypassRef.current = false;
  }, [enabled]);

  const isEnabled = useCallback(
    () => enabledRef.current && !bypassRef.current,
    [],
  );

  // Async mode (no `confirm`) → custom UI via active / accept / reject.
  const { active, accept, reject } = useNavigationGuard({
    enabled: isEnabled,
  });

  const dialog = active ? (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-leave-title"
        className="w-full max-w-md border border-line bg-panel p-5"
      >
        <p
          id="unsaved-leave-title"
          className="font-display text-2xl tracking-wide text-ink"
        >
          Unsaved changes
        </p>
        <p className="mt-3 text-sm text-muted">
          Leave without saving? Your latest edits won’t be kept on this list.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            data-testid="unsaved-stay"
            onClick={reject}
          >
            Stay
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="unsaved-leave"
            onClick={accept}
          >
            Leave
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    dialog,
    /** Call before intentional navigations (Share submit). */
    allowLeave() {
      bypassRef.current = true;
    },
  };
}
