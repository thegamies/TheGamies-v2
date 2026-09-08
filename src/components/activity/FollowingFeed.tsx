import Link from "next/link";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { GameCover } from "@/components/ui/GameCover";
import { feedCardHeadline, feedGameAction } from "@/lib/activity/feed-copy";
import { formatFeedEventTime, formatFeedGameClock } from "@/lib/activity/feed-time";
import {
  flattenFeedCardGames,
  type FeedCard,
  type FeedCardGame,
} from "@/lib/activity/group-feed";

export function FollowingFeed({ cards }: { cards: FeedCard[] }) {
  return (
    <ol className="mt-8 space-y-8">
      {cards.map((card) => {
        const games = flattenFeedCardGames(card);
        const listLinks = card.sections.flatMap((section) =>
          section.type === "list" && section.revealed && section.listSlug
            ? [section.listSlug]
            : [],
        );
        return (
          <li key={card.key} className="border-b border-line pb-8">
            <PersonIdentity
              displayName={card.displayName}
              username={card.username}
              avatarUrl={card.avatarUrl}
              href={`/u/${card.username}`}
            />
            <p className="mt-3 text-lg text-ink">{feedCardHeadline(card)}</p>
            <p className="mt-1 text-sm text-muted">
              <time dateTime={card.createdAt.toISOString()}>
                {formatFeedEventTime(card.createdAt)}
              </time>
            </p>
            {listLinks.map((slug) => (
              <p key={slug} className="mt-2 text-sm text-muted">
                <Link
                  href={`/u/${card.username}/${slug}`}
                  className="hover:text-ink"
                >
                  View list
                </Link>
              </p>
            ))}
            <FeedCoverRow games={games} />
          </li>
        );
      })}
    </ol>
  );
}

function FeedCoverRow({ games }: { games: FeedCardGame[] }) {
  if (games.length === 0) return null;
  return (
    <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
      {games.map((game) => {
        const action = feedGameAction(game.kind);
        return (
          <li key={`${game.gameId}:${game.kind}:${game.createdAt.toISOString()}`} className="min-w-0">
            <Link href={`/games/${game.slug}`} className="group block">
              <GameCover title={game.title} imageUrl={game.coverUrl} />
              <p className="mt-1 truncate text-xs text-ink group-hover:text-accent">
                {game.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {action ? `${action} · ` : null}
                <time dateTime={game.createdAt.toISOString()}>
                  {formatFeedGameClock(game.createdAt)}
                </time>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
