"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type RouteStatusKind = "loading" | "error" | "not-found";

type RouteStatusProps = {
  status: RouteStatusKind;
  title?: string;
  message?: string;
  onRetry?: () => void;
};

const COPY: Record<
  RouteStatusKind,
  { title: string; message: string }
> = {
  loading: {
    title: "Loading",
    message: "This community view is coming up.",
  },
  error: {
    title: "Couldn’t load this page",
    message: "This community view didn’t load. Try again.",
  },
  "not-found": {
    title: "Community not found",
    message: "This community doesn’t exist or isn’t available.",
  },
};

/**
 * Route-level loading / error / not-found. Keeps the page rail and a reserved
 * block so the layout does not collapse. Loading uses a square accent spinner.
 */
export function RouteStatus({
  status,
  title,
  message,
  onRetry,
}: RouteStatusProps) {
  const copy = COPY[status];
  const heading = title ?? copy.title;
  const body = message ?? copy.message;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <section className="flex min-h-[50vh] flex-col justify-center py-10">
        {status === "loading" ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="route-spinner" aria-hidden />
            <p className="mt-4 text-sm font-semibold tracking-wide text-ink">
              {heading}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              <Link href="/communities" className="hover:text-ink">
                Communities
              </Link>
            </p>
            <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
              {heading}
            </h1>
            <p className="mt-4 max-w-xl text-muted">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {status === "error" && onRetry ? (
                <Button type="button" variant="bordered" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
              <Link
                href="/communities"
                className="inline-flex items-center justify-center rounded-[var(--radius-control)] border border-line px-4 py-2 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
              >
                Back to communities
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
