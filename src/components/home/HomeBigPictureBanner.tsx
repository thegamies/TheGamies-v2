"use client";

import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";

export type HomeBigPictureGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

function MarqueeRow({
  games,
  direction,
  durationSec,
}: {
  games: HomeBigPictureGame[];
  direction: "left" | "right";
  durationSec: number;
}) {
  const loop = [...games, ...games];
  const anim =
    direction === "left" ? "home-bp-marquee-left" : "home-bp-marquee-right";

  return (
    <div className="home-bp-row flex w-max gap-2 sm:gap-2.5">
      <ul
        className="home-bp-track flex gap-2 sm:gap-2.5"
        style={{
          animation: `${anim} ${durationSec}s linear infinite`,
        }}
      >
        {loop.map((game, i) => (
          <li
            key={`${game.gameId}-${i}`}
            className="w-[4.5rem] shrink-0 sm:w-[5.25rem] md:w-24"
          >
            <Link
              href={`/games/${game.slug}`}
              className="block opacity-90 transition-opacity hover:opacity-100"
              tabIndex={i >= games.length ? -1 : undefined}
              aria-hidden={i >= games.length ? true : undefined}
            >
              <GameCover
                title={game.title}
                imageUrl={game.coverUrl}
                fluid
                width={96}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Full-bleed Steam Big Picture–style cover wall under the site nav,
 * with homepage deck + CTAs overlaid at the bottom.
 */
export function HomeBigPictureBanner({
  games,
}: {
  games: HomeBigPictureGame[];
}) {
  const hasWall = games.length >= 4;
  const mid = Math.ceil(games.length / 2);
  const rowA = games.slice(0, mid);
  const rowB = games.slice(mid);
  const top = rowA.length >= 4 ? rowA : games;
  const bottom = rowB.length >= 4 ? rowB : [...games].reverse();

  return (
    <section
      className="home-bp relative -mx-[var(--gutter)] overflow-hidden bg-paper"
      aria-label="Welcome"
    >
      {hasWall ? (
        <div
          className="pointer-events-none absolute inset-0 select-none"
          aria-hidden
        >
          {/* Mask fades covers out; paper underneath is the true page color */}
          <div className="home-bp-wall absolute inset-x-0 top-0 flex flex-col gap-2 opacity-90 sm:gap-2.5">
            <div className="pointer-events-auto">
              <MarqueeRow games={top} direction="left" durationSec={80} />
            </div>
            <div className="pointer-events-auto">
              <MarqueeRow games={bottom} direction="right" durationSec={95} />
            </div>
          </div>
          <div className="home-bp-fade-x absolute inset-0" />
          <div className="home-bp-fade-y absolute inset-0" />
        </div>
      ) : null}

      <div className="relative z-[1] mx-auto flex min-h-[15rem] max-w-[var(--page-max)] flex-col justify-end px-[var(--gutter)] pb-10 pt-20 sm:min-h-[17rem] sm:pb-12 sm:pt-24">
        <p className="max-w-lg font-serif text-xl leading-snug text-ink sm:text-2xl">
          Personal Game of the Year lists and community awards.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/games"
            className="rounded-[var(--radius-control)] border border-line bg-paper/80 px-5 py-3 text-sm tracking-wide text-ink backdrop-blur-sm transition-colors hover:border-accent"
          >
            Browse games
          </Link>
          <Link
            href="/communities"
            className="rounded-[var(--radius-control)] border border-line bg-paper/80 px-5 py-3 text-sm tracking-wide text-ink backdrop-blur-sm transition-colors hover:border-accent"
          >
            Communities
          </Link>
        </div>
      </div>
    </section>
  );
}
