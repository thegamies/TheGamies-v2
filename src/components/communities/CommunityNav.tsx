import Link from "next/link";
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
          className={`border px-3 py-1.5 text-sm tracking-wide transition-colors ${
            active === item.key
              ? "border-accent text-accent"
              : "border-line text-muted hover:border-accent hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
