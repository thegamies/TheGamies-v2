import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[var(--page-max)] items-baseline justify-between gap-6 px-[var(--gutter)] py-5">
        <Link
          href="/"
          className="font-display text-3xl tracking-wide text-ink hover:text-accent"
        >
          The Gamies
        </Link>
        <nav className="flex gap-5 text-sm text-muted">
          <Link href="/games" className="hover:text-ink">
            Games
          </Link>
          <Link href="/design-system" className="hover:text-ink">
            Design
          </Link>
        </nav>
      </div>
    </header>
  );
}
