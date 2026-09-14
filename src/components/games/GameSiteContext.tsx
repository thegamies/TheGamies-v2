import Link from "next/link";
import type { GamePublicListRef } from "@/lib/catalog/game-public-value";
import {
  hasGameGotyPresence,
  type GameGotyRankings,
} from "@/lib/live-aggregate/game-rankings";

export function GameSiteContext({
  title,
  rankings,
  lists,
}: {
  title: string;
  rankings: GameGotyRankings;
  lists: GamePublicListRef[];
}) {
  const years = rankings.byYear.filter((year) => year.rank > 0);
  if (!hasGameGotyPresence(rankings) && lists.length === 0) return null;

  const latest = years[0];

  return (
    <section className="mt-8 border-t border-line pt-6" aria-label="On The Gamies">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        On The Gamies
      </p>
      {latest ? (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {title} is currently rank {latest.rank} on the{" "}
          <Link
            href={`/game-of-the-year/${latest.year}`}
            className="text-ink underline decoration-line underline-offset-2 hover:text-accent"
          >
            {latest.year} Game of the Year
          </Link>{" "}
          board
          {latest.votes != null
            ? `, from ${latest.votes.toLocaleString("en-US")} ${
                latest.votes === 1 ? "list" : "lists"
              }`
            : ""}
          . Rank comes from personal lists, not the catalog record.{" "}
          <Link
            href="/rankings"
            className="text-ink underline decoration-line underline-offset-2 hover:text-accent"
          >
            How rankings work
          </Link>
          .
        </p>
      ) : lists.length > 0 ? (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {title} appears on public Game of the Year and custom lists. Catalog
          details come from IGDB; the lists below are original to this site.{" "}
          <Link
            href="/rankings"
            className="text-ink underline decoration-line underline-offset-2 hover:text-accent"
          >
            How rankings work
          </Link>
          .
        </p>
      ) : null}

      {lists.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {lists.map((list) => (
            <li key={list.href}>
              <Link href={list.href} className="text-ink hover:text-accent">
                {list.title}
              </Link>
              <span className="text-muted">
                {" "}
                · {list.ownerName}
                {list.rank != null ? ` · #${list.rank}` : ""}
                {list.year != null ? ` · ${list.year}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
