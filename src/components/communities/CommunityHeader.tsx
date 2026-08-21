import Link from "next/link";
import { CopyInviteButton } from "@/components/communities/CopyInviteButton";
import { MastheadBanner } from "@/components/ui/MastheadBanner";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
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

type HeaderProps = NavProps & {
  name: string;
  invitePath?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
};

/**
 * Community masthead — optional banner, avatar + name, primary section chips.
 */
export function CommunityHeader({
  name,
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  active,
  invitePath = null,
  avatarUrl = null,
  bannerUrl = null,
}: HeaderProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <header className="-mx-[var(--gutter)] border-b border-line bg-panel">
      {bannerUrl ? <MastheadBanner src={bannerUrl} fadeTo="panel" /> : null}
      <div
        className={`relative z-[1] px-[var(--gutter)] pb-5 ${
          bannerUrl ? "-mt-14 pt-2 sm:-mt-16" : "pt-4"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/communities" className="hover:text-ink">
            Communities
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <div
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-line bg-paper font-display text-2xl tracking-wide text-ink"
                aria-hidden
              >
                {initial}
              </div>
            )}
            <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
              {name}
            </h1>
          </div>
          {invitePath ? <CopyInviteButton path={invitePath} /> : null}
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
      </div>
    </header>
  );
}
