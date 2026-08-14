import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[var(--page-max)] flex-1 flex-col justify-center px-[var(--gutter)] py-24">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        The Gamies
      </p>
      <h1 className="mt-4 font-display text-6xl leading-none tracking-wide text-ink sm:text-8xl">
        Editorial Standings
      </h1>
      <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-muted">
        Community awards, Hosts, and ranked lists — rebuilt with a restrained
        soft-brutal design system.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/game-of-the-year"
          className="rounded-[var(--radius-control)] bg-accent px-5 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
        >
          Live standings
        </Link>
        <Link
          href="/games"
          className="rounded-[var(--radius-control)] border border-line px-5 py-3 text-sm tracking-wide text-ink transition-colors hover:border-accent"
        >
          Browse games
        </Link>
        <Link
          href="/communities"
          className="rounded-[var(--radius-control)] border border-line px-5 py-3 text-sm tracking-wide text-ink transition-colors hover:border-accent"
        >
          Communities
        </Link>
      </div>
    </main>
  );
}
