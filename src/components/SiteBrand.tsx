"use client";

import Link from "next/link";

/**
 * Site mark in the header — accent brand color on every page.
 */
export function SiteBrand() {
  return (
    <Link
      href="/"
      className="font-display text-3xl tracking-wide text-accent transition-opacity hover:opacity-90"
    >
      The Gamies
    </Link>
  );
}
