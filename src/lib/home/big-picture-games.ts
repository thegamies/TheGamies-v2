import { browseGames } from "@/lib/catalog";
import type { HomeBigPictureGame } from "@/components/home/HomeBigPictureBanner";

/** Covers per year for the homepage Big Picture strip. */
export const HOME_BIG_PICTURE_PER_YEAR = 12;

/**
 * Top IGDB-popularity games for the current and previous calendar year
 * (same sort as `/games` browse). Dedupes by game id, newest year first.
 */
export async function listHomeBigPictureGames(
  now: Date = new Date(),
): Promise<HomeBigPictureGame[]> {
  const year = now.getUTCFullYear();
  const years = [year, year - 1];

  const batches = await Promise.all(
    years.map((y) =>
      browseGames({
        year: y,
        sort: "popularity",
        sortDir: "desc",
        releaseStatus: "all",
        limit: HOME_BIG_PICTURE_PER_YEAR,
        offset: 0,
      }).catch(() => []),
    ),
  );

  const seen = new Set<string>();
  const out: HomeBigPictureGame[] = [];
  for (const rows of batches) {
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      if (!row.coverUrl) continue;
      seen.add(row.id);
      out.push({
        gameId: row.id,
        slug: row.slug,
        title: row.title,
        coverUrl: row.coverUrl,
      });
    }
  }
  return out;
}
