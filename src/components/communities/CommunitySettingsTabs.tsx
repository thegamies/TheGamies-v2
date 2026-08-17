import Link from "next/link";
import { LIVE_PUBLIC_LABEL } from "@/components/communities/CommunityHeader";
import { navItemClass } from "@/components/ui/navLevels";
import {
  communitySettingsHref,
  type CommunitySettingsTab,
} from "@/lib/communities/community-settings-href";
import { EDITION_PUBLIC_LABEL } from "@/lib/communities/edition-status";

export function CommunitySettingsTabs({
  slug,
  tab,
}: {
  slug: string;
  tab: CommunitySettingsTab;
}) {
  return (
    <nav
      className="mt-6 flex flex-wrap gap-5 border-b border-line"
      aria-label="Settings"
    >
      <Link
        href={communitySettingsHref(slug, { tab: "live" })}
        className={navItemClass("secondary", tab === "live")}
      >
        {LIVE_PUBLIC_LABEL}
      </Link>
      <Link
        href={communitySettingsHref(slug, { tab: "events" })}
        className={navItemClass("secondary", tab === "events")}
      >
        {EDITION_PUBLIC_LABEL}
      </Link>
      <Link
        href={communitySettingsHref(slug, { tab: "community" })}
        className={navItemClass("secondary", tab === "community")}
      >
        Community
      </Link>
      <Link
        href={communitySettingsHref(slug, { tab: "invite" })}
        className={navItemClass("secondary", tab === "invite")}
      >
        Invite
      </Link>
    </nav>
  );
}
