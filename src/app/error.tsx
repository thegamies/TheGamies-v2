"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-sm font-semibold text-accent">Error</p>
      <h1 className="mt-3 font-display text-5xl tracking-wide">
        Something went wrong.
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Keep this page open and try again. The rest of the site is still here.
      </p>
      <p className="mt-8">
        <button
          type="button"
          onClick={() => reset()}
          className="border border-line bg-panel px-4 py-2 text-sm text-ink"
        >
          Try again
        </button>
      </p>
    </main>
  );
}
