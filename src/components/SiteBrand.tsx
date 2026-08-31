"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Site mark in the header — accent brand color on every page.
 * Larger on the homepage, where it sits over the Big Picture hero.
 */
export function SiteBrand() {
  const home = usePathname() === "/";

  return (
    <Link
      href="/"
      className={
        home
          ? "font-display text-5xl leading-none tracking-wide text-accent transition-opacity hover:opacity-90 sm:text-6xl"
          : "font-display text-3xl leading-none tracking-wide text-accent transition-opacity hover:opacity-90"
      }
    >
      The Gamies
    </Link>
  );
}
