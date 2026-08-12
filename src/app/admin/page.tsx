import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const ADMIN_LINKS = [
  {
    href: "/admin/sync",
    title: "Catalog sync",
    description: "Import and enrich the game catalog.",
  },
  {
    href: "/admin/rankings",
    title: "Live rankings",
    description: "Reveal scores, refresh dirty keys, or rebuild a year.",
  },
  {
    href: "/admin/seed",
    title: "Standings seed",
    description: "Create synthetic GOTY voters for standings QA.",
  },
] as const;

export default function AdminIndexPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Ops</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Admin
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Site operations tools. Each screen unlocks with the admin code.
        </p>

        <ul className="mt-10 max-w-xl divide-y divide-line border-y border-line">
          {ADMIN_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block py-5 transition-colors hover:text-accent"
              >
                <span className="font-display text-2xl tracking-wide text-ink">
                  {item.title}
                </span>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
