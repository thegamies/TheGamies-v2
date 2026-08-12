import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";

export type StandingGameCardProps = {
  place: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  year?: number | null;
  points?: number | null;
  priority?: boolean;
};

/** Games-browse cover card with rank — used on edition standings grids. */
export function StandingGameCard({
  place,
  slug,
  title,
  coverUrl,
  year,
  points,
  priority = false,
}: StandingGameCardProps) {
  const meta =
    points != null && year != null
      ? `${points} pts · ${year}`
      : points != null
        ? `${points} pts`
        : year != null
          ? String(year)
          : null;

  return (
    <Link href={`/games/${slug}`} className="group block">
      <div className="relative">
        <GameCover title={title} imageUrl={coverUrl} priority={priority} />
        <span className="pointer-events-none absolute top-2 left-2 rounded-[var(--radius-artwork)] bg-paper/90 px-1.5 py-0.5 leading-none">
          <RankMarker rank={place} size="sm" />
        </span>
      </div>
      <p className="mt-2 font-display text-lg leading-none tracking-wide text-ink group-hover:text-accent">
        {title}
      </p>
      {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
    </Link>
  );
}

export function StandingGameCardGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </ul>
  );
}
