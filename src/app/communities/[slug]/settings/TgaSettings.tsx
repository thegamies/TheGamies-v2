import Link from "next/link";
import { communityCreateTgaHref } from "@/lib/communities/community-settings-href";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { tgaPromoTitle } from "@/lib/tga-pickem/promo";
import type { CommunityTgaYearListItem } from "@/lib/tga-pickem/service";
import { tgaStatusLabel } from "@/lib/tga-pickem/status";
import { tgaYearHref } from "@/lib/tga-pickem/year-href";

const createLinkClass =
  "inline-flex items-center justify-center rounded-[var(--radius-control)] border border-line px-4 py-2 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent";

const actionLinkClass =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent";

export function TgaSettings({
  slug,
  years,
}: {
  slug: string;
  years: CommunityTgaYearListItem[];
}) {
  return (
    <div>
      <p className="mt-6 max-w-xl text-sm text-muted">
        Members use their own sheet. Winners come from the site show. Create{" "}
        {TGA_PUBLIC_LABEL} for a year the site has on, then manage Hosts.
      </p>

      <div className="mt-6">
        <Link href={communityCreateTgaHref(slug)} className={createLinkClass}>
          Create {TGA_PUBLIC_LABEL}
        </Link>
      </div>

      {years.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No Pick’em yet.</p>
      ) : (
        <ul className="mt-10 border-t border-line">
          {years.map((row) => {
            const path = `/communities/${encodeURIComponent(slug)}/the-game-awards/${row.year}`;
            return (
              <li
                key={row.year}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 border-b border-line py-5"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl tracking-wide text-ink">
                    {tgaPromoTitle(row.year)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {tgaStatusLabel(row.status)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={tgaYearHref(path, { view: "settings" })}
                    className={actionLinkClass}
                  >
                    Manage hosts
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
