import type { ReactNode } from "react";
import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";

export type HomeChapterCover = {
  gameId: string;
  title: string;
  coverUrl: string | null;
  place?: number;
};

/**
 * Decorative still for a homepage chapter. Covers are not links.
 */
export function HomeChapterFigure({
  covers,
  ranked = false,
}: {
  covers: HomeChapterCover[];
  ranked?: boolean;
}) {
  const still = ranked ? covers.slice(0, 5) : covers.slice(0, 10);
  const hasStill = still.length >= 4;

  return (
    <figure className="min-w-0">
      <div
        className={`overflow-hidden rounded-[var(--radius-artwork)] border border-line bg-panel ${
          hasStill ? "" : "min-h-[12rem] sm:min-h-[14rem]"
        }`}
      >
        {hasStill ? (
          ranked ? (
            <ul className="grid grid-cols-5 gap-1 p-2 sm:gap-1.5 sm:p-2.5">
              {still.map((game) => (
                <li key={game.gameId} className="min-w-0">
                  {game.place != null ? (
                    <p className="mb-1 font-display text-lg leading-none tracking-wide text-ink sm:text-xl">
                      {game.place}
                    </p>
                  ) : null}
                  <GameCover
                    title={game.title}
                    imageUrl={game.coverUrl}
                    fluid
                    width={96}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-5 gap-1 p-2 sm:p-2.5">
              {still.map((game) => (
                <li key={game.gameId}>
                  <GameCover
                    title={game.title}
                    imageUrl={game.coverUrl}
                    fluid
                    width={80}
                  />
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </figure>
  );
}

const outlinedLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent";

const accentLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-accent px-3 text-xs font-semibold tracking-wide text-accent transition-opacity hover:opacity-90";

/** Copy on one side, still on the other. On small screens, copy stacks first. */
export function HomeChapterSplit({
  title,
  children,
  covers,
  ranked = false,
  imageSide = "right",
  actions,
}: {
  title: string;
  children: ReactNode;
  covers: HomeChapterCover[];
  ranked?: boolean;
  imageSide?: "left" | "right";
  actions: Array<{ href: string; label: string; accent?: boolean }>;
}) {
  const copy = (
    <div className="min-w-0">
      <h3 className="m-0 font-display text-2xl tracking-wide text-ink sm:text-3xl">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted">
        {children}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={action.accent ? accentLinkClass : outlinedLinkClass}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid items-center gap-3 md:grid-cols-2 md:gap-4">
      <div
        className={
          imageSide === "left"
            ? "min-w-0 md:order-2"
            : "min-w-0 md:max-w-md md:justify-self-end"
        }
      >
        {copy}
      </div>
      <div className={imageSide === "left" ? "min-w-0 md:order-1" : "min-w-0"}>
        <HomeChapterFigure covers={covers} ranked={ranked} />
      </div>
    </div>
  );
}
