import {
  editionStatusLabel,
  formatEditionScheduleTime,
  type EditionSchedule,
  type EditionStatus,
} from "@/lib/communities/edition-status";
import type { PromoBannerCopy } from "@/lib/promo/banner-copy";

export const EDITION_PROMO_KICKER = "Community vote";

export function editionPromoTitle(year: number): string {
  return `${year} Video Game\u00A0Awards`;
}

function scheduleStamp(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return formatEditionScheduleTime(date);
}

function withKicker(copy: PromoBannerCopy): PromoBannerCopy {
  return { kicker: EDITION_PROMO_KICKER, ...copy };
}

export function editionPromoCopy(
  status: EditionStatus,
  schedule: EditionSchedule = {},
): PromoBannerCopy {
  const opens = scheduleStamp(schedule.opensAt);
  const closes = scheduleStamp(schedule.closesAt);
  const reveals = scheduleStamp(schedule.publishesAt);

  switch (status) {
    case "draft":
      return withKicker({
        accent: "Not public yet.",
        rest: "This ceremony is still being set up.",
        status: editionStatusLabel(status),
        live: false,
        cta: "Open event",
      });
    case "scheduled":
      return withKicker({
        accent: "Coming soon.",
        rest: opens ? `Voting opens ${opens}.` : "Voting hasn’t opened yet.",
        status: editionStatusLabel(status),
        live: false,
        cta: "View event",
      });
    case "open":
      return withKicker({
        accent: "Voting is open.",
        rest: closes
          ? `Lock your ballot by ${closes}.`
          : "Rank Game of the Year and make your category picks.",
        status: "Voting open",
        live: true,
        cta: "Cast your ballot",
      });
    case "closed":
      return withKicker({
        accent: "Ballots are locked.",
        rest: reveals
          ? `Results reveal ${reveals}.`
          : "Standings appear when results are ready.",
        status: editionStatusLabel(status),
        live: false,
        cta: "View event",
      });
    case "published":
      return withKicker({
        accent: "Results are in.",
        rest: "See Combined, Community, and Hosts.",
        status: "Results",
        live: false,
        cta: "See results",
      });
  }
}
