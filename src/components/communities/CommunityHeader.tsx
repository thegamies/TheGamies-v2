import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import {
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export type CommunityNavActive =
  | "overview"
  | "live"
  | "edition"
  | "settings";

type NavProps = {
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  /** Non-draft featured edition status, or null if none public. */
  editionStatus: EditionStatus | null;
  active: CommunityNavActive;
};

/**
 * Community section switcher — primary bordered chips.
 * Horizontally scrollable on small screens (no wrap, no underline).
 */
export function CommunityNav({
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  active,
}: NavProps) {
  const items: { href: string; label: string; key: CommunityNavActive }[] = [
    { href: `/communities/${slug}`, label: "Overview", key: "overview" },
  ];
  if (liveEnabled) {
    items.push({
      href: `/communities/${slug}/live`,
      label: "Live",
      key: "live",
    });
  }
  if (editionStatus && showEditionNav(editionStatus)) {
    items.push({
      href: `/communities/${slug}/edition`,
      label: "Edition",
      key: "edition",
    });
  }
  if (canManage) {
    items.push({
      href: `/communities/${slug}/settings`,
      label: "Settings",
      key: "settings",
    });
  }

  return (
    <nav aria-label="Community">
      <div className="scrollbar-none flex flex-nowrap gap-2 overflow-x-auto">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`shrink-0 ${navItemClass("primary", active === item.key)}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

type HeaderProps = NavProps & {
  name: string;
};

/**
 * Community masthead — `--panel` band with name + primary section chips.
 * No meta between title and nav; no underline on the switcher.
 */
export function CommunityHeader({
  name,
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  active,
}: HeaderProps) {
  return (
    <header className="-mx-[var(--gutter)] border-b border-line bg-panel px-[var(--gutter)] py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {name}
      </h1>
      <div className="mt-6">
        <CommunityNav
          slug={slug}
          liveEnabled={liveEnabled}
          canManage={canManage}
          editionStatus={editionStatus}
          active={active}
        />
      </div>
    </header>
  );
}
