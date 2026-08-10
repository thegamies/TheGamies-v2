import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { GameCover } from "@/components/ui/GameCover";
import { getGameBySlug } from "@/lib/catalog";

type Params = Promise<{ slug: string }>;

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

export default async function GameDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  let game: Awaited<ReturnType<typeof getGameBySlug>> = null;
  try {
    game = await getGameBySlug(slug);
  } catch {
    notFound();
  }
  if (!game) notFound();

  const developers = game.companies.filter((c) => c.developer);
  const publishers = game.companies.filter((c) => c.publisher);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/games" className="hover:text-ink">
            Games
          </Link>
          {game.year ? ` · ${game.year}` : null}
        </p>

        <div className="mt-6 grid gap-10 md:grid-cols-[12rem_1fr] lg:grid-cols-[14rem_1fr]">
          <div className="max-w-[14rem]">
            <GameCover
              title={game.title}
              imageUrl={game.coverUrl}
              priority
            />
          </div>
          <div>
            <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
              {game.title}
            </h1>
            {game.gameType ? (
              <p className="mt-2 text-sm text-muted">{game.gameType}</p>
            ) : null}
            {game.summary ? (
              <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-ink/90">
                {game.summary}
              </p>
            ) : null}

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
                <div>
                  <dt className="text-muted">Time to beat</dt>
                  <dd className="mt-1 text-ink">
                    {[
                      formatHours(game.timeToBeat.hastily),
                      formatHours(game.timeToBeat.normally),
                      formatHours(game.timeToBeat.completely),
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—"}
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
