import Link from "next/link";
import { CopyInviteButton } from "@/components/communities/CopyInviteButton";
import { navItemClass } from "@/components/ui/navLevels";
import {
  EDITION_PUBLIC_LABEL,
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export const LIVE_PUBLIC_LABEL = "Live Rankings";

export type CommunityNavActive =
  | "overview"
  | "live"
  | "edition"
  | "members"
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
  invitePath?: string | null;
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
  invitePath = null,
}: HeaderProps) {
  return (
    <header className="-mx-[var(--gutter)] border-b border-line bg-panel px-[var(--gutter)] py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
          {name}
        </h1>
        {invitePath ? (
          <CopyInviteButton path={invitePath} />
        ) : null}
      </div>
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
