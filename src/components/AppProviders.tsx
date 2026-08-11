"use client";

import { NavigationGuardProvider } from "nextjs-nav-guard";

/** Root client providers. NavigationGuardProvider is required for unsaved-leave prompts. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <NavigationGuardProvider>{children}</NavigationGuardProvider>;
}
