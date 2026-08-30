import Link from "next/link";
import { editionPromoTitle } from "@/lib/communities/edition-promo";
import type { PromoBannerCopy, PromoBannerKind } from "@/lib/promo/banner-copy";
import { tgaPromoTitle } from "@/lib/tga-pickem/promo";

export type PromoBannerProps = PromoBannerCopy & {
  year: number;
  href: string;
  kind?: PromoBannerKind;
};

function yearHalves(year: number): { lead: string; tail: string } {
  const raw = String(year);
  if (raw.length < 4) return { lead: raw, tail: "" };
  return { lead: raw.slice(0, 2), tail: raw.slice(2) };
}

export function PromoBanner({
  year,
  href,
  kind = "tga",
  kicker,
  accent,
  rest,
  cta,
}: PromoBannerProps) {
  const title = kind === "event" ? editionPromoTitle(year) : tgaPromoTitle(year);
  const halves = yearHalves(year);

  return (
    <section className="promo-banner" aria-label={title}>
      <div className="promo-banner__copy">
        {kicker ? <p className="promo-banner__kicker">{kicker}</p> : null}
        <p className="promo-banner__eyebrow text-pretty">{title}</p>
        <p className="promo-banner__headline text-pretty">
          <span className="promo-banner__accent">{accent}</span> {rest}
        </p>
        <div className="promo-banner__brush" aria-hidden />
      </div>

      <div className="promo-banner__meta">
        <Link href={href} className="promo-banner__cta">
          {cta} <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="promo-banner__year" aria-hidden>
        <span className="promo-banner__year-desktop">{year}</span>
        <span className="promo-banner__year-mobile">
          {halves.lead}
          {halves.tail ? (
            <>
              <br />
              {halves.tail}
            </>
          ) : null}
        </span>
      </div>
    </section>
  );
}
