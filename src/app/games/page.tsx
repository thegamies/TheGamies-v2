import Link from "next/link";
import type { Metadata } from "next";
import { GameCover } from "@/components/ui/GameCover";
import { browseGames } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Games",
};

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
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Catalog</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-7xl">
          Games
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Browse the synced IGDB catalog. Artwork first, filters second.
        </p>

        <form className="mt-8 flex flex-wrap items-end gap-4 border-y border-line py-5">
          <label className="text-sm text-muted">
            Search
            <input
              name="q"
              defaultValue={q}
              className="mt-1 block min-w-[12rem] border border-line bg-panel px-3 py-2 text-ink"
              placeholder="Title"
            />
          </label>
          <label className="text-sm text-muted">
            Year
            <input
              name="year"
              type="number"
              defaultValue={yearRaw ?? ""}
              className="mt-1 block w-28 border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            Sort
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 block border border-line bg-panel px-3 py-2 text-ink"
            >
              <option value="popularity">Popularity</option>
              <option value="name">Name</option>
              <option value="first_release_date">Release date</option>
            </select>
          </label>
          <label className="text-sm text-muted">
            Direction
            <select
              name="sortDir"
              defaultValue={sortDir}
              className="mt-1 block border border-line bg-panel px-3 py-2 text-ink"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
          <label className="text-sm text-muted">
            Release
            <select
              name="releaseStatus"
              defaultValue={releaseStatus}
              className="mt-1 block border border-line bg-panel px-3 py-2 text-ink"
            >
              <option value="all">All</option>
              <option value="released">Released</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </form>

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
