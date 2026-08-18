"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type RouteStatusKind = "loading" | "error" | "not-found";

type RouteStatusProps = {
  status: RouteStatusKind;
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Render inside a persistent layout (no second page shell). */
  inset?: boolean;
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
 * Route-level loading / error / not-found.
 * `inset` keeps header/tab chrome from the parent layout and only replaces
 * the content block. Loading uses a square accent spinner.
 */
export function RouteStatus({
  status,
  title,
  message,
  onRetry,
  inset = false,
}: RouteStatusProps) {
  const copy = COPY[status];
  const heading = title ?? copy.title;
  const body = message ?? copy.message;

  const loadingBlock = (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="route-spinner" aria-hidden />
      <p className="mt-4 text-sm font-semibold tracking-wide text-ink">
        {heading}
      </p>
      <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
    </div>
  );

  const errorBlock = (
    <div>
      {inset ? null : (
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/communities" className="hover:text-ink">
            Communities
          </Link>
        </p>
      )}
      <h1
        className={`font-display tracking-wide text-ink ${
          inset
            ? "text-4xl sm:text-5xl"
            : "mt-2 text-5xl md:text-6xl"
        }`}
      >
        {heading}
      </h1>
      <p className={`max-w-xl text-muted ${inset ? "mt-3" : "mt-4"}`}>
        {body}
      </p>
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
  );

  const bodyBlock =
    status === "loading" ? (
      loadingBlock
    ) : (
      errorBlock
    );

  if (inset) {
    return (
      <section className="flex min-h-[40vh] flex-col justify-center py-10">
        {bodyBlock}
      </section>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <section className="flex min-h-[50vh] flex-col justify-center py-10">
        {bodyBlock}
      </section>
    </main>
  );
}
