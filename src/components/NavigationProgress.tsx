"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Editorial Standings route progress: accent hairline, no spinner, no glow.
 * Mount once in the root layout (keep that layout a Server Component).
 */
export const NAVIGATION_PROGRESS = {
  color: "#ff5a1f",
  height: 2,
  showSpinner: false,
  shadow: false,
} as const;

export function NavigationProgress() {
  return (
    <NextTopLoader
      color={NAVIGATION_PROGRESS.color}
      height={NAVIGATION_PROGRESS.height}
      showSpinner={NAVIGATION_PROGRESS.showSpinner}
      shadow={NAVIGATION_PROGRESS.shadow}
    />
  );
}
