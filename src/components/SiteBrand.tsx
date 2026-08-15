"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Site mark in the header. Hidden on `/` where the homepage hero already
 * carries “The Gamies” as the brand signal.
 */
export function SiteBrand() {
  const pathname = usePathname();
  if (pathname === "/") {
    return <span className="block min-h-[1.75rem] w-[7.5rem]" aria-hidden />;
  }

  return (
    <Link
      href="/"
      className="font-display text-3xl tracking-wide text-ink hover:text-accent"
    >
      The Gamies
    </Link>
  );
}
