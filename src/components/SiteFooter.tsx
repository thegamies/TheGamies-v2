import Link from "next/link";
import { AdPrivacyOptions } from "@/components/ads/AdPrivacyOptions";
import { SITE_SOCIAL_ICONS } from "@/components/BrandIcons";
import { IGDB_URL, SITE_INFO_LINKS, SITE_SOCIAL_LINKS } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-[var(--page-max)] flex-col gap-4 px-[var(--gutter)] py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-1"
          aria-label="Site information"
        >
          {SITE_INFO_LINKS.map(({ href, label }, index) => (
            <span key={href} className="inline-flex items-center gap-x-1">
              {index > 0 ? (
                <span className="text-line" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link href={href} className="transition-colors hover:text-ink">
                {label}
              </Link>
            </span>
          ))}
          <AdPrivacyOptions />
        </nav>

        <nav className="flex items-center gap-2" aria-label="The Gamies on social media">
          {SITE_SOCIAL_LINKS.map(({ key, label, href }) => {
            const Icon = SITE_SOCIAL_ICONS[key];
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-ink"
              >
                <Icon className="size-4" />
              </a>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 sm:items-end">
          <p>
            Game data provided by{" "}
            <a
              href={IGDB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink transition-colors hover:text-accent"
            >
              IGDB
            </a>
          </p>
          <p className="text-xs text-muted">© {year} The Gamies</p>
        </div>
      </div>
    </footer>
  );
}
