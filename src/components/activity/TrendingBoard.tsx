import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";
import { navItemClass } from "@/components/ui/navLevels";
import {
  TRENDING_WINDOW_OPTIONS,
  followingHref,
  trendingHref,
} from "@/lib/activity/paths";
import type { TrendingBoardRow } from "@/lib/activity/query";
import type { TrendingWindowHours } from "@/lib/activity/trending";

export function TrendingBoard({
  rows,
  hours,
  scope,
  communitySlug,
  showFollowingScope,
  followingPage,
  empty,
}: {
  rows: TrendingBoardRow[];
  hours: TrendingWindowHours;
  scope?: "site" | "following";
  communitySlug?: string;
  showFollowingScope?: boolean;
  followingPage?: boolean;
  empty: string;
}) {
  return (
    <div>
      {showFollowingScope && !communitySlug ? (
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href={trendingHref({ hours, scope: "site" })}
            className={navItemClass("tertiary", scope !== "following")}
          >
            Everyone
          </Link>
          <Link
            href={trendingHref({ hours, scope: "following" })}
            className={navItemClass("tertiary", scope === "following")}
          >
            People you follow
          </Link>
        </div>
      ) : null}
      <div className={`flex flex-wrap gap-2 ${showFollowingScope && !communitySlug && !followingPage ? "mt-4" : "mt-6"}`}>
        {TRENDING_WINDOW_OPTIONS.map((option) => (
          <Link
            key={option.hours}
            href={
              followingPage
                ? followingHref({ view: "trending", hours: option.hours })
                : trendingHref({
                    hours: option.hours,
                    scope,
                    communitySlug,
                  })
            }
            className={`rounded-[var(--radius-control)] border px-3 py-1.5 text-sm ${
              option.hours === hours
                ? "border-accent text-accent"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-10 max-w-xl text-muted">{empty}</p>
      ) : (
        <ul className="mt-10 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((row) => (
            <li key={row.gameId} className="min-w-0">
              <Link href={`/games/${row.slug}`} className="group block">
                <GameCover title={row.title} imageUrl={row.coverUrl} />
                <p className="mt-2 truncate text-sm text-ink group-hover:text-accent">
                  {row.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
