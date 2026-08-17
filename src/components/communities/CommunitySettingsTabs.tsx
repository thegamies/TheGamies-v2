import Link from "next/link";
import { LIVE_PUBLIC_LABEL } from "@/components/communities/CommunityHeader";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
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
    <ScrollableNav aria-label="Settings" className="mt-6">
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
    </ScrollableNav>
  );
}
