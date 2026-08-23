import { PROFILE_SOCIAL_ICONS } from "@/components/BrandIcons";
import {
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  normalizeSocialLinks,
} from "@/lib/profile/social-links";

export function ProfileSocialLinks({
  value,
  className = "mt-4",
}: {
  value: unknown;
  className?: string;
}) {
  const links = normalizeSocialLinks(value);
  const visible = SOCIAL_LINK_KEYS.filter((key) => Boolean(links[key]));
  if (visible.length === 0) return null;

  return (
    <nav
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="Social profiles"
    >
      {visible.map((key) => {
        const href = links[key];
        if (!href) return null;
        const Icon = PROFILE_SOCIAL_ICONS[key];
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={SOCIAL_LINK_LABELS[key]}
            title={SOCIAL_LINK_LABELS[key]}
            className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-ink"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </nav>
  );
}
