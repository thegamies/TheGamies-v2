import Link from "next/link";
import type { Metadata } from "next";
import { GamesBrowseFilters } from "@/components/games/GamesBrowseFilters";
import { GameCover } from "@/components/ui/GameCover";
import { browseGames } from "@/lib/catalog";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Games",
  description: "Browse the game catalog on The Gamies.",
  path: "/games",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const yearRaw = first(params.year);
  const year = yearRaw ? Number(yearRaw) : undefined;
  const sort = (first(params.sort) as "popularity" | "name" | "first_release_date") ?? "popularity";
  const sortDir = (first(params.sortDir) as "asc" | "desc") ?? "desc";
  const releaseStatus =
    (first(params.releaseStatus) as "all" | "released" | "upcoming") ?? "all";

  let games: Awaited<ReturnType<typeof browseGames>> = [];
  let error: string | null = null;
  try {
    games = await browseGames({
      q: q || undefined,
      year: year && !Number.isNaN(year) ? year : undefined,
      sort,
      sortDir,
      releaseStatus,
      limit: 48,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
          Games
        </h1>

        <GamesBrowseFilters
          key={`${q}|${year ?? ""}|${sort}|${sortDir}|${releaseStatus}`}
          q={q}
          year={year && !Number.isNaN(year) ? year : undefined}
          sort={sort}
          sortDir={sortDir}
          releaseStatus={releaseStatus}
        />

        {error ? (
          <p className="mt-8 text-accent">
            Could not load games. Try again later.
          </p>
        ) : games.length === 0 ? (
          <p className="mt-8 text-muted">No games in the catalog yet.</p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {games.map((game) => (
              <li key={game.id}>
                <Link href={`/games/${game.slug}`} className="group block">
                  <GameCover title={game.title} imageUrl={game.coverUrl} />
                  <p className="mt-2 font-display text-lg leading-none tracking-wide text-ink group-hover:text-accent">
                    {game.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {game.year ?? "TBD"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
