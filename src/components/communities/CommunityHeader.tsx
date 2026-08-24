import Link from "next/link";
import { CopyInviteButton } from "@/components/communities/CopyInviteButton";
import { ProfileSocialLinks } from "@/components/profile/ProfileSocialLinks";
import { MastheadBanner } from "@/components/ui/MastheadBanner";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  communityLiveNavYear,
  communityPrimaryHref,
  resolveCommunityEditionNavYear,
  type CommunityNavActive,
} from "@/lib/communities/community-primary-nav";
import {
  EDITION_PUBLIC_LABEL,
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { resolveTgaLandingYear } from "@/lib/tga-pickem/service";

export { TGA_PUBLIC_LABEL };
export type { CommunityNavActive };

export const LIVE_PUBLIC_LABEL = "Live Rankings";

type NavProps = {
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  /** Non-draft featured edition status, or null if none public. */
  editionStatus: EditionStatus | null;
  tgaEnabled?: boolean;
  active: CommunityNavActive;
  /** Featured public event year — avoids a `/edition` redirect that resets scroll. */
  editionYear?: number | null;
  /** Promoted pick’em year — avoids a `/the-game-awards` redirect that resets scroll. */
  tgaYear?: number | null;
  /** When set, missing years are resolved to match the index redirects. */
  communityId?: string;
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
  tgaEnabled = false,
  active,
  editionYear = null,
  tgaYear = null,
}: NavProps) {
  const years = {
    edition: editionYear,
    live: liveEnabled ? communityLiveNavYear() : null,
    tga: tgaYear,
  };
  const items: { href: string; label: string; key: CommunityNavActive }[] = [
    {
      href: communityPrimaryHref(slug, "overview"),
      label: "Overview",
      key: "overview",
    },
  ];
  if (liveEnabled) {
    items.push({
      href: communityPrimaryHref(slug, "live", years),
      label: LIVE_PUBLIC_LABEL,
      key: "live",
    });
  }
  if (editionStatus && showEditionNav(editionStatus)) {
    items.push({
      href: communityPrimaryHref(slug, "edition", years),
      label: EDITION_PUBLIC_LABEL,
      key: "edition",
    });
  }
  if (tgaEnabled) {
    items.push({
      href: communityPrimaryHref(slug, "tga", years),
      label: TGA_PUBLIC_LABEL,
      key: "tga",
    });
  }
  items.push({
    href: communityPrimaryHref(slug, "members"),
    label: "Members",
    key: "members",
  });
  if (canManage) {
    items.push({
      href: communityPrimaryHref(slug, "settings"),
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
          scroll={false}
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
  socialLinks?: unknown;
  /** When false, masthead only (public non-member home). Default true. */
  showNav?: boolean;
};

/** Resolves landing years so primary chips skip index redirects (scroll reset). */
export async function CommunityPrimaryNav(props: NavProps) {
  let editionYear = props.editionYear ?? null;
  let tgaYear = props.tgaYear ?? null;
  const needEdition =
    Boolean(props.editionStatus && showEditionNav(props.editionStatus)) &&
    editionYear == null &&
    Boolean(props.communityId);
  const needTga = Boolean(props.tgaEnabled) && tgaYear == null;
  if (needEdition || needTga) {
    const [resolvedEdition, resolvedTga] = await Promise.all([
      needEdition
        ? resolveCommunityEditionNavYear(props.communityId!).catch(() => null)
        : Promise.resolve(editionYear),
      needTga ? resolveTgaLandingYear().catch(() => null) : Promise.resolve(tgaYear),
    ]);
    if (needEdition) editionYear = resolvedEdition;
    if (needTga) tgaYear = resolvedTga;
  }
  return (
    <CommunityNav {...props} editionYear={editionYear} tgaYear={tgaYear} />
  );
}

/**
 * Community masthead — optional banner, avatar + name, primary section chips.
 */
export function CommunityHeader({
  name,
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  tgaEnabled = false,
  active,
  invitePath = null,
  avatarUrl = null,
  bannerUrl = null,
  socialLinks = null,
  showNav = true,
  editionYear = null,
  tgaYear = null,
  communityId,
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
            <div className="min-w-0">
              <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
                {name}
              </h1>
              <ProfileSocialLinks value={socialLinks} className="mt-3" />
            </div>
          </div>
          {invitePath ? <CopyInviteButton path={invitePath} /> : null}
        </div>
        {showNav ? (
          <div className="mt-6">
            <CommunityPrimaryNav
              slug={slug}
              liveEnabled={liveEnabled}
              canManage={canManage}
              editionStatus={editionStatus}
              tgaEnabled={tgaEnabled}
              active={active}
              editionYear={editionYear}
              tgaYear={tgaYear}
              communityId={communityId}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
