import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";

export type HomeCoverStripGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

const outlinedLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent";

/**
 * Capped cover row for homepage discovery (trending, upcoming).
 * Not a numbered standings list — sort is internal.
 */
export function HomeCoverStrip({
  title,
  moreHref,
  moreLabel = "See all",
  games,
  empty,
  label,
}: {
  title: string;
  moreHref: string;
  moreLabel?: string;
  games: HomeCoverStripGame[];
  empty: string;
  label: string;
}) {
  return (
    <article className="mt-8 sm:mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-1">
        <h2 className="m-0 font-display text-2xl leading-none tracking-wide sm:text-3xl">
          <Link
            href={moreHref}
            className="text-ink transition-colors hover:text-accent"
          >
            {title}
          </Link>
        </h2>
        <Link href={moreHref} className={outlinedLinkClass}>
          {moreLabel}
        </Link>
      </div>
      {games.length === 0 ? (
        <p className="mt-3 max-w-xl text-sm text-muted">{empty}</p>
      ) : (
        <HorizontalScroll className="mt-2" label={label}>
          <ul className="flex gap-3 pe-1">
            {games.map((game) => (
              <li key={game.gameId} className="w-[5.5rem] shrink-0 sm:w-24">
                <Link href={`/games/${game.slug}`} className="group block">
                  <GameCover
                    title={game.title}
                    imageUrl={game.coverUrl}
                    fluid
                    width={96}
                  />
                  <p className="mt-2 truncate text-sm text-ink group-hover:text-accent">
                    {game.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </HorizontalScroll>
      )}
    </article>
  );
}
