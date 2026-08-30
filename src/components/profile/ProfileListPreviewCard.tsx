import Link from "next/link";
import {
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { listSharePath } from "@/lib/lists/urls";
import type { ProfileListPreview } from "@/lib/lists/profile-preview";

export function ProfileListPreviewCard({
  username,
  list,
}: {
  username: string;
  list: ProfileListPreview;
}) {
  const href = listSharePath({
    publicId: list.publicId,
    slug: list.slug,
    username,
  });
  const kind = list.listType === "goty" ? "Game of the Year" : "Custom";

  return (
    <article>
      <Link href={href} className="group">
        <h2 className="font-display text-3xl tracking-wide text-ink transition-colors group-hover:text-accent">
          {list.title}
        </h2>
      </Link>
      <p className="mt-1 text-sm text-muted">
        {kind}
        {list.year ? ` · ${list.year}` : ""}
      </p>

      {list.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No games ranked yet.</p>
      ) : (
        <HorizontalScroll className="mt-4" label={`${list.title} top five`}>
          <ol className={standingStripListClass}>
            {list.items.map((item) => (
              <li
                key={item.gameId}
                className={standingStripColClass(item.rank === 1)}
              >
                <StandingGameCard
                  place={item.rank}
                  placeSize="lg"
                  slug={item.slug}
                  title={item.title}
                  coverUrl={item.coverUrl}
                  priority={item.rank === 1}
                  pinCover
                />
              </li>
            ))}
          </ol>
        </HorizontalScroll>
      )}
    </article>
  );
}
