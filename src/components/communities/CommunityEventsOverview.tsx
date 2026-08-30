import { PromoBanner } from "@/components/promo/PromoBanner";
import { editionPromoCopy } from "@/lib/communities/edition-promo";
import {
  EDITION_PUBLIC_LABEL,
  type EditionStatus,
} from "@/lib/communities/edition-status";
import { tgaPromoCopy } from "@/lib/tga-pickem/promo";
import type { TgaYearSchedule } from "@/lib/tga-pickem/status";

export type CommunityEventsOverviewItem = {
  year: number;
  status: EditionStatus;
  opensAt?: Date | null;
  closesAt?: Date | null;
  publishesAt?: Date | null;
};

export type CommunityOverviewTga = TgaYearSchedule & { year: number };

export function CommunityEventsOverview({
  slug,
  editions,
  tga = null,
}: {
  slug: string;
  editions: CommunityEventsOverviewItem[];
  tga?: CommunityOverviewTga | null;
}) {
  if (editions.length === 0 && !tga) return null;

  const encoded = encodeURIComponent(slug);

  return (
    <section>
      {tga ? (
        <PromoBanner
          kind="tga"
          year={tga.year}
          href={`/communities/${encoded}/the-game-awards/${tga.year}`}
          {...tgaPromoCopy(tga)}
        />
      ) : null}
      {editions.length > 0 ? (
        <>
          <h2
            className={`font-display text-3xl tracking-wide text-ink ${tga ? "mt-10" : ""}`}
          >
            {EDITION_PUBLIC_LABEL}
          </h2>
          <ul className="mt-6 grid gap-3">
            {editions.map((edition) => {
              const href = `/communities/${encoded}/edition/${edition.year}`;
              const copy = editionPromoCopy(edition.status, {
                opensAt: edition.opensAt,
                closesAt: edition.closesAt,
                publishesAt: edition.publishesAt,
              });

              return (
                <li key={edition.year}>
                  <PromoBanner
                    kind="event"
                    year={edition.year}
                    href={href}
                    {...copy}
                  />
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
