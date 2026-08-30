import { formatEditionScheduleTime } from "@/lib/communities/edition-status";
import type { PromoBannerCopy } from "@/lib/promo/banner-copy";
import { computeTgaStatus, type TgaStatus, type TgaYearSchedule } from "@/lib/tga-pickem/status";

export type { PromoBannerCopy };

export function tgaPromoTitle(year: number): string {
  return `${year} Video Game Awards\u00A0Pick’em`;
}

/** Prefer the promoted year, else the newest enabled year. */
export function pickCommunityTgaPromoYear<
  T extends { year: number; promoted: boolean },
>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
    return b.year - a.year;
  })[0] ?? null;
}

function scheduleStamp(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return formatEditionScheduleTime(date);
}

export function tgaPromoCopy(
  year: TgaYearSchedule,
  now: Date = new Date(),
): PromoBannerCopy {
  const status = computeTgaStatus(year, now);
  return tgaPromoCopyForStatus(status, year);
}

export function tgaPromoCopyForStatus(
  status: TgaStatus,
  schedule: TgaYearSchedule = { enabled: true },
): PromoBannerCopy {
  const opens = scheduleStamp(schedule.opensAt);
  const show = scheduleStamp(schedule.showStartsAt);

  switch (status) {
    case "scheduled":
      return {
        accent: "Picks soon.",
        rest: opens
          ? `The board opens ${opens}.`
          : "Get ready to call every category.",
        status: "Coming soon",
        live: false,
        cta: "Open Pick’em",
      };
    case "open":
      return {
        accent: "Picks are open.",
        rest: show
          ? `Lock your calls before the show starts ${show}.`
          : "Call every category before the show starts.",
        status: "Picks open",
        live: true,
        cta: "Make your picks",
      };
    case "locked":
      return {
        accent: "Live results.",
        rest: "See how your picks stack up.",
        status: "Live",
        live: true,
        cta: "Open Pick’em",
      };
    case "draft":
    case "off":
      return {
        accent: "Coming soon.",
        rest: "The board isn’t open yet.",
        status: "Coming soon",
        live: false,
        cta: "Open Pick’em",
      };
  }
}
