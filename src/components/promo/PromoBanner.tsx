import Link from "@/lib/next-link";
import { editionPromoTitle } from "@/lib/communities/edition-promo";
import type { PromoBannerCopy, PromoBannerKind } from "@/lib/promo/banner-copy";
import { tgaPromoTitle } from "@/lib/tga-pickem/promo";

export type PromoBannerProps = PromoBannerCopy & {
  year: number;
  href: string;
  kind?: PromoBannerKind;
};

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
  const label = `${title}. ${accent} ${rest} ${cta}`;

  return (
    <section className="promo-banner" aria-label={title}>
      <Link href={href} className="promo-banner__hit" aria-label={label}>
        <div className="promo-banner__copy">
          {kicker ? <p className="promo-banner__kicker">{kicker}</p> : null}
          <p className="promo-banner__eyebrow text-pretty">{title}</p>
          <p className="promo-banner__headline text-pretty">
            <span className="promo-banner__accent">{accent}</span> {rest}
          </p>
        </div>

        <div className="promo-banner__aside">
          <div className="promo-banner__year" aria-hidden>
            {year}
          </div>
          <span className="promo-banner__cta">{cta}</span>
        </div>
      </Link>
    </section>
  );
}
