import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameCategoryWins } from "@/components/games/GameCategoryWins";
import { GameGotyRankings } from "@/components/games/GameGotyRankings";
import { GameSummary } from "@/components/games/GameSummary";
import { GameCover } from "@/components/ui/GameCover";
import { getGameBySlug } from "@/lib/catalog";
import {
  getGameDetailCategoryWins,
  getGameDetailGotyRankings,
  type GameCategoryWin,
  type GameGotyRankings as GameGotyRankingsData,
} from "@/lib/live-aggregate/game-rankings";

type Params = Promise<{ slug: string }>;

const COVER_WIDTH = 240;
const COVER_HEIGHT = 320;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const game = await getGameBySlug(slug);
    if (!game) return { title: "Game" };
    return {
      title: game.title,
      description: game.summary?.slice(0, 160) ?? undefined,
    };
  } catch {
    return { title: "Game" };
  }
}

function formatHours(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const TIME_TO_BEAT_LABELS = [
  ["hastily", "Main story"],
  ["normally", "Story + extras"],
  ["completely", "Completionist"],
] as const;

export default async function GameDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  let game: Awaited<ReturnType<typeof getGameBySlug>> = null;
  try {
    game = await getGameBySlug(slug);
  } catch {
    notFound();
  }
  if (!game) notFound();

  let rankings: GameGotyRankingsData = { byYear: [], viaParent: null };
  let categoryWins: GameCategoryWin[] = [];
  try {
    rankings = await getGameDetailGotyRankings(game);
  } catch {
    rankings = { byYear: [], viaParent: null };
  }
  try {
    const awards = await getGameDetailCategoryWins(game);
    categoryWins = awards.wins;
  } catch {
    categoryWins = [];
  }

  const developers = game.companies.filter((c) => c.developer);
  const publishers = game.companies.filter((c) => c.publisher);

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/games" className="hover:text-ink">
            Games
          </Link>
          {game.year ? ` · ${game.year}` : null}
        </p>

        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="w-[240px] shrink-0">
            <GameCover
              title={game.title}
              imageUrl={game.coverUrl}
              width={COVER_WIDTH}
              height={COVER_HEIGHT}
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
              {game.title}
            </h1>

            {game.summary ? <GameSummary text={game.summary} /> : null}

            <GameGotyRankings
              stats={rankings}
              layout="broadcast-compact"
              className="mt-8"
            />

            <GameCategoryWins wins={categoryWins} className="mt-8" />

            <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Released</dt>
                <dd className="mt-1 text-ink">
                  {game.firstReleaseDate
                    ? game.firstReleaseDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })
                    : "TBD"}
                </dd>
              </div>
              {game.platforms.length ? (
                <div>
                  <dt className="text-muted">Platforms</dt>
                  <dd className="mt-1 text-ink">
                    {game.platforms
                      .map((p) => p.abbreviation || p.name)
                      .join(", ")}
                  </dd>
                </div>
              ) : null}
              {game.genres.length ? (
                <div>
                  <dt className="text-muted">Genres</dt>
                  <dd className="mt-1 text-ink">
                    {game.genres.map((g) => g.name).join(", ")}
                  </dd>
                </div>
              ) : null}
              {developers.length ? (
                <div>
                  <dt className="text-muted">Developers</dt>
                  <dd className="mt-1 text-ink">
                    {developers.map((c) => c.name).join(", ")}
                  </dd>
                </div>
              ) : null}
              {publishers.length ? (
                <div>
                  <dt className="text-muted">Publishers</dt>
                  <dd className="mt-1 text-ink">
                    {publishers.map((c) => c.name).join(", ")}
                  </dd>
                </div>
              ) : null}
              {game.timeToBeat ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Time to beat</dt>
                  <dd className="mt-2 flex flex-wrap gap-x-8 gap-y-3">
                    {TIME_TO_BEAT_LABELS.map(([key, label]) => {
                      const hours = formatHours(game.timeToBeat?.[key]);
                      if (!hours) return null;
                      return (
                        <div key={key}>
                          <p className="tabular-nums text-ink">{hours}</p>
                          <p className="mt-0.5 text-xs text-muted">{label}</p>
                        </div>
                      );
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </main>
    </>
  );
}
