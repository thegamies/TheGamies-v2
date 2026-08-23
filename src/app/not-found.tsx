import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-sm font-semibold text-accent">Not found</p>
      <h1 className="mt-3 font-display text-5xl tracking-wide">
        This page is not here.
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        The list, game, or community you followed may have moved, or the
        address is incomplete.
      </p>
      <p className="mt-8">
        <Link href="/" className="text-ink underline decoration-line underline-offset-4">
          Back to The Gamies
        </Link>
      </p>
    </main>
  );
}
