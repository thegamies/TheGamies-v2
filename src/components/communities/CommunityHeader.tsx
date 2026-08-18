import Link from "next/link";
import { CopyInviteButton } from "@/components/communities/CopyInviteButton";
import { CommunityNav } from "@/components/communities/CommunityNav";
import type { CommunityNavActive } from "@/lib/communities/community-nav";
import type { EditionStatus } from "@/lib/communities/edition-status";

export { LIVE_PUBLIC_LABEL } from "@/components/communities/CommunityNav";
export type { CommunityNavActive };

type HeaderProps = {
  name: string;
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  editionStatus: EditionStatus | null;
  active?: CommunityNavActive;
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
    </header>
  );
}
