import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import {
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";

type Props = {
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  /** Non-draft featured edition status, or null if none public. */
  editionStatus: EditionStatus | null;
  active: "overview" | "live" | "edition" | "settings";
};

/** Primary community section switcher (bordered chips). */
export function CommunityNav({
  slug,
  liveEnabled,
  canManage,
  editionStatus,
  active,
}: Props) {
  const items: { href: string; label: string; key: Props["active"] }[] = [
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
    <nav className="mt-8 flex flex-wrap gap-2" aria-label="Community">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={navItemClass("primary", active === item.key)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
