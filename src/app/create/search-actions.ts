"use server";

import { browseGames } from "@/lib/catalog";

export type GameSearchHit = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export async function searchGamesForList(input: {
  q: string;
  year?: number;
  gotyMode?: boolean;
}): Promise<GameSearchHit[]> {
  const q = input.q.trim();

  const rows = await browseGames({
    q: q.length >= 2 ? q : undefined,
    year: input.year,
    releaseStatus: input.gotyMode ? "released" : "all",
    excludeEditions: Boolean(input.gotyMode),
    sort: "popularity",
    sortDir: "desc",
    limit: 24,
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: r.coverUrl,
  }));
}
