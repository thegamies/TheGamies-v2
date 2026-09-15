"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABOUT_SECTION_LINKS } from "@/lib/about/sections";

export function AboutSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"
      aria-label="About sections"
    >
      {ABOUT_SECTION_LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              current
                ? "text-ink"
                : "transition-colors hover:text-ink"
            }
            aria-current={current ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
