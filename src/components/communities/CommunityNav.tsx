import Link from "next/link";

type Props = {
  slug: string;
  liveEnabled: boolean;
  canManage: boolean;
  active: "overview" | "live" | "settings";
};

export function CommunityNav({
  slug,
  liveEnabled,
  canManage,
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
