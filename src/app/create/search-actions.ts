"use server";

import { browseGames } from "@/lib/catalog";
import {
  parseAwardCategoryEligibility,
} from "@/lib/live-aggregate/award-category-defs";
import { browseInputForCategoryEligibility } from "@/lib/live-aggregate/category-eligibility";

export type GameSearchHit = {
  id: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export async function searchGamesForList(input: {
  q: string;
  year?: number;
  gotyMode?: boolean;
  eligibility?: string;
  allowEditions?: boolean;
}): Promise<GameSearchHit[]> {
  const q = input.q.trim();
  const year = input.year;
  const eligibility = parseAwardCategoryEligibility(input.eligibility);
  const allowEditions = input.allowEditions === true;

  const categoryBrowse =
    year != null && input.eligibility
      ? browseInputForCategoryEligibility(year, eligibility, allowEditions)
      : null;

  const rows = await browseGames({
    q: q.length >= 2 ? q : undefined,
    ...(categoryBrowse ?? {
      year,
      releaseStatus: input.gotyMode ? "released" : "all",
      excludeEditions: Boolean(input.gotyMode),
    }),
    sort: "popularity",
    sortDir: "desc",
    limit: 24,
  });

  return rows.map((r) => ({
    id: r.id,
    igdbId: r.igdbId,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: r.coverUrl,
  }));
}
