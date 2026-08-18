"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  communityNavActiveFromPath,
  type CommunityNavActive,
} from "@/lib/communities/community-nav";
import {
  EDITION_PUBLIC_LABEL,
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export const LIVE_PUBLIC_LABEL = "Live Rankings";

export type { CommunityNavActive };

type NavProps = {
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  /** Non-draft featured edition status, or null if none public. */
  editionStatus: EditionStatus | null;
  /** Override path-derived active chip (design-system fixtures). */
  active?: CommunityNavActive;
};

/**
 * Community section switcher — primary bordered chips.
 * Horizontally scrollable on small screens (no wrap, no underline).
 * Active chip follows the URL so a persistent layout can keep this strip.
 */
export function CommunityNav({
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  active: activeOverride,
}: NavProps) {
  const pathname = usePathname() ?? "";
  const active = activeOverride ?? communityNavActiveFromPath(pathname, slug);

  const items: { href: string; label: string; key: CommunityNavActive }[] = [
    { href: `/communities/${slug}`, label: "Overview", key: "overview" },
  ];
  if (liveEnabled) {
    items.push({
      href: `/communities/${slug}/live`,
      label: LIVE_PUBLIC_LABEL,
      key: "live",
    });
  }
  if (editionStatus && showEditionNav(editionStatus)) {
    items.push({
      href: `/communities/${slug}/edition`,
      label: EDITION_PUBLIC_LABEL,
      key: "edition",
    });
  }
  items.push({
    href: `/communities/${slug}/members`,
    label: "Members",
    key: "members",
  });
  if (canManage) {
    items.push({
      href: `/communities/${slug}/settings`,
      label: "Settings",
      key: "settings",
    });
  }

  return (
    <ScrollableNav
      aria-label="Community"
      border={false}
      fadeFrom="panel"
      rowClassName="items-center gap-2"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={navItemClass("primary", active === item.key)}
        >
          {item.label}
        </Link>
      ))}
    </ScrollableNav>
  );
}
