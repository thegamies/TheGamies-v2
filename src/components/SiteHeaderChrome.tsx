"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SessionKeepAlive } from "@/components/SessionKeepAlive";

/**
 * On `/`, sit over the Big Picture hero (transparent fade).
 * Elsewhere, normal bordered bar on paper.
 */
export function SiteHeaderChrome({
  children,
  signedIn = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <header
      className={
        home
          ? "absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-paper/95 via-paper/70 to-transparent"
          : "relative z-50 bg-paper"
      }
    >
      {signedIn ? <SessionKeepAlive /> : null}
      {children}
    </header>
  );
}
