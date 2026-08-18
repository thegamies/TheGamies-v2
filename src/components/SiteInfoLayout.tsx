import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_INFO_LINKS } from "@/lib/site";

export function SiteInfoLayout({
  title,
  deck,
  children,
}: {
  title: string;
  deck?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-10">
      <nav
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs uppercase tracking-[0.2em] text-muted"
        aria-label="Information"
      >
        {SITE_INFO_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-4 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {title}
      </h1>
      {deck ? <p className="mt-3 text-sm text-muted">{deck}</p> : null}
      <article className="mt-8 max-w-2xl space-y-6 text-muted [&_a]:text-ink [&_a]:underline [&_a]:decoration-line [&_a]:underline-offset-2 hover:[&_a]:text-accent [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-wide [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </article>
    </main>
  );
}
