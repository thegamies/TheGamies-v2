import Link from "next/link";
import { LibraryStatusIcon } from "@/components/library/LibraryStatusIcon";
import { GameCover } from "@/components/ui/GameCover";
import { LIBRARY_STATUS_LABELS } from "@/lib/activity/kinds";
import type { LibraryShelfItem } from "@/lib/library/service";

export function LibraryShelf({
  items,
  showVisibility,
}: {
  items: LibraryShelfItem[];
  showVisibility?: boolean;
}) {
  return (
    <ul className="mt-8 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.gameId} className="min-w-0">
          <Link href={`/games/${item.slug}`} className="group block">
            <GameCover title={item.title} imageUrl={item.coverUrl} />
            <p className="mt-2 truncate text-sm text-ink group-hover:text-accent">
              {item.title}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <LibraryStatusIcon status={item.status} className="size-3.5" />
              <span className="truncate">
                {LIBRARY_STATUS_LABELS[item.status]}
                {showVisibility && item.visibility === "private"
                  ? " · Only you"
                  : ""}
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
