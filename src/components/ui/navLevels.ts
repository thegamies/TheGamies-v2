/**
 * Navigation level styles — Editorial Standings hierarchy.
 *
 * Primary: bordered chips — community masthead section switcher (inside CommunityHeader).
 * Secondary: underline tabs on a hairline — in-page views under a local heading only.
 * Tertiary: plain text toggle (board / filter).
 * Multi-year edition: EditionYearSelect beside the section heading (not nav levels).
 */

export type NavLevel = "primary" | "secondary" | "tertiary";

export function navItemClass(level: NavLevel, active: boolean): string {
  switch (level) {
    case "primary":
      return active
        ? "border border-accent px-3 py-1.5 text-sm tracking-wide text-accent transition-colors"
        : "border border-line px-3 py-1.5 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-ink";
    case "secondary":
      return active
        ? "border-b-2 border-accent pb-1.5 text-sm tracking-wide text-accent transition-colors"
        : "border-b-2 border-transparent pb-1.5 text-sm tracking-wide text-muted transition-colors hover:text-ink";
    case "tertiary":
      return active
        ? "text-sm tracking-wide text-accent transition-colors"
        : "text-sm tracking-wide text-muted transition-colors hover:text-ink";
  }
}
