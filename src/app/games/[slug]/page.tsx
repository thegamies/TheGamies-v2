import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameCategoryWins } from "@/components/games/GameCategoryWins";
import { GameGotyRankings } from "@/components/games/GameGotyRankings";
import { GameImagesSection } from "@/components/games/GameImagesSection";
import { GameScreenshotsSection } from "@/components/games/GameScreenshotsSection";
import { GameSiteContext } from "@/components/games/GameSiteContext";
import { GameSummary } from "@/components/games/GameSummary";
import { GameVideosSection } from "@/components/games/GameVideosSection";
import { GameLibraryControls } from "@/components/library/GameLibraryControls";
import { GameCover } from "@/components/ui/GameCover";
import {
  getGameArtworksForDetail,
  getGameScreenshotsForDetail,
  getGameVideosForDetail,
} from "@/lib/catalog";
import { getGamePageData } from "@/lib/catalog/game-public-value";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { countFollowsLibraryForGame } from "@/lib/activity/query";
import { listFollowedProfileIds } from "@/lib/follow/service";
import { getLibraryEntry } from "@/lib/library/service";
import { ogImagePath } from "@/lib/seo/og-path";
import { publicPageMetadata } from "@/lib/seo/site";
import { adsenseAccountMetadata } from "@/lib/ads/adsense";

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
    const data = await getGamePageData(slug);
    if (!data) return { title: "Game" };
    return {
      ...publicPageMetadata({
        title: data.game.title,
        description: data.game.summary?.slice(0, 160) ?? undefined,
        path: `/games/${slug}`,
        image: ogImagePath({ kind: "game", slug }),
        index: data.hasPublicSiteValue,
        follow: true,
      }),
      ...(data.hasPublicSiteValue ? adsenseAccountMetadata() : {}),
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
  const data = await getGamePageData(slug).catch(() => null);
  if (!data) notFound();
  const { game, rankings, categoryWins, publicLists } = data;

  let artworks: Awaited<ReturnType<typeof getGameArtworksForDetail>> = [];
  let screenshots: Awaited<ReturnType<typeof getGameScreenshotsForDetail>> = [];
  let videos: Awaited<ReturnType<typeof getGameVideosForDetail>> = [];
  try {
    [artworks, screenshots, videos] = await Promise.all([
      getGameArtworksForDetail(game.id),
      getGameScreenshotsForDetail(game.id),
      getGameVideosForDetail(game.id),
    ]);
  } catch {
    artworks = [];
    screenshots = [];
    videos = [];
  }

  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const libraryEntry = profile
    ? await getLibraryEntry(profile.id, game.id).catch(() => null)
    : null;
  const followedIds = profile
    ? await listFollowedProfileIds(profile.id).catch(() => [] as string[])
    : [];
  const followCounts =
    profile && followedIds.length > 0
      ? await countFollowsLibraryForGame(game.id, followedIds).catch(() => null)
      : null;

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
          <div className="mx-auto w-[240px] shrink-0 sm:mx-0">
            <GameCover
              title={game.title}
              imageUrl={game.coverUrl}
              width={COVER_WIDTH}
              height={COVER_HEIGHT}
              priority
            />
            <div className="border border-t-0 border-line bg-panel p-3">
              <GameLibraryControls
                gameId={game.id}
                gameSlug={game.slug}
                signedIn={Boolean(profile)}
                initialStatus={libraryEntry?.status ?? null}
                initialVisibility={libraryEntry?.visibility ?? "public"}
                followCounts={followCounts}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
              {game.title}
            </h1>

            {game.summary ? <GameSummary text={game.summary} /> : null}

            <GameSiteContext
              title={game.title}
              rankings={rankings}
              lists={publicLists}
            />

            <GameGotyRankings
              stats={rankings}
              layout="broadcast-compact"
              className="mt-8"
            />

            <GameCategoryWins wins={categoryWins} className="mt-8" />

            <dl className="mt-10 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
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

            {videos.length || artworks.length || screenshots.length ? (
              <div className="mt-10 space-y-10">
                <GameVideosSection videos={videos} />
                <GameScreenshotsSection screenshots={screenshots} />
                <GameImagesSection artworks={artworks} />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
