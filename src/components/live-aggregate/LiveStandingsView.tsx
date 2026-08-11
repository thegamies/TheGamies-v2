import { RankMarker } from "@/components/ui/RankMarker";
import { GameCover } from "@/components/ui/GameCover";
import type {
  CategoryStandingsBlock,
  StandingsGameRow,
  StandingsPage,
} from "@/lib/live-aggregate/service";
import Link from "next/link";

function standingsHref(year: number, page: number): string {
  if (page <= 1) return `/game-of-the-year/${year}`;
  return `/game-of-the-year/${year}?page=${page}`;
}

function StandingsRow({
  row,
  revealed,
}: {
  row: StandingsGameRow;
  revealed: boolean;
}) {
  return (
    <li className="grid grid-cols-[3rem_3rem_1fr_auto] items-center gap-3 border-b border-line py-3 sm:grid-cols-[3.5rem_3.5rem_1fr_5rem_5rem]">
      <RankMarker rank={row.place} size="md" />
      <Link href={`/games/${row.slug}`} className="block w-full">
        <GameCover title={row.title} imageUrl={row.coverUrl} />
      </Link>
      <div className="min-w-0">
        <Link
          href={`/games/${row.slug}`}
          className="block truncate font-semibold text-ink hover:text-accent"
        >
          {row.title}
        </Link>
        {row.year != null ? (
          <p className="text-xs text-muted">{row.year}</p>
        ) : null}
      </div>
      {revealed ? (
        <>
          <p className="hidden text-right text-sm tabular-nums text-ink sm:block">
            {row.score}
          </p>
          <p className="text-right text-sm tabular-nums text-muted">
            {row.listMentions}
          </p>
        </>
      ) : (
        <p className="col-span-1 text-right text-xs text-muted sm:col-span-2">
          —
        </p>
      )}
    </li>
  );
}

function CategoryBlock({
  block,
  revealed,
}: {
  block: CategoryStandingsBlock;
  revealed: boolean;
}) {
  if (block.rows.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display text-3xl tracking-wide text-ink">
        {block.label}
      </h2>
      {block.description ? (
        <p className="mt-2 max-w-2xl text-sm text-muted">{block.description}</p>
      ) : null}
      <ol className="mt-6">
        {block.rows.slice(0, 10).map((row) => (
          <li
            key={`${block.categoryId}-${row.gameId}`}
            className="grid grid-cols-[3rem_3rem_1fr_auto] items-center gap-3 border-b border-line py-3"
          >
            <RankMarker rank={row.place} size="sm" />
            <Link href={`/games/${row.slug}`} className="block w-full">
              <GameCover title={row.title} imageUrl={row.coverUrl} />
            </Link>
            <Link
              href={`/games/${row.slug}`}
              className="min-w-0 truncate font-semibold text-ink hover:text-accent"
            >
              {row.title}
            </Link>
            <p className="text-right text-sm tabular-nums text-muted">
              {revealed ? row.voteCount : "—"}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GotyPager({ page }: { page: StandingsPage }) {
  if (page.gotyTotal <= page.pageSize) return null;

  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.page * page.pageSize, page.gotyTotal);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm"
      aria-label="Standings pages"
    >
      <p className="text-muted">
        {from}–{to} of {page.gotyTotal} · page {page.page} of {page.totalPages}
      </p>
      <div className="flex gap-2">
        {page.page > 1 ? (
          <Link
            href={standingsHref(page.year, page.page - 1)}
            className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Previous
          </Link>
        ) : (
          <span className="border border-line px-3 py-1.5 text-muted/50">
            Previous
          </span>
        )}
        {page.page < page.totalPages ? (
          <Link
            href={standingsHref(page.year, page.page + 1)}
            className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Next
          </Link>
        ) : (
          <span className="border border-line px-3 py-1.5 text-muted/50">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

export function LiveStandingsView({
  page,
  yearOptions,
}: {
  page: StandingsPage;
  yearOptions: number[];
}) {
  const revealed = page.detailedStatsRevealed;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-10">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        The Gamies
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-wide text-ink sm:text-7xl">
        {page.year} Game of the Year
      </h1>
      <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted">
        Live standings from signed-in Game of the Year lists
        {page.listCount > 0 ? ` · ${page.listCount} lists` : null}.
      </p>

      {!revealed ? (
        <p className="mt-4 max-w-2xl text-sm text-muted" role="status">
          Rank order is public. Detailed scores and vote counts stay hidden
          until they are revealed.
        </p>
      ) : null}

      {!page.scoresFresh ? (
        <p className="mt-2 text-sm text-muted" role="status">
          Standings are catching up with recent list changes.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {yearOptions.map((y) => (
          <Link
            key={y}
            href={`/game-of-the-year/${y}`}
            className={`border px-3 py-1.5 text-sm tracking-wide transition-colors ${
              y === page.year
                ? "border-accent text-accent"
                : "border-line text-muted hover:border-accent hover:text-ink"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <div className="mb-2 hidden grid-cols-[3.5rem_3.5rem_1fr_5rem_5rem] gap-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted sm:grid">
          <span>Rank</span>
          <span>Cover</span>
          <span>Game</span>
          <span className="text-right">{revealed ? "Score" : ""}</span>
          <span className="text-right">{revealed ? "Lists" : ""}</span>
        </div>
        {page.goty.length === 0 ? (
          <p className="border-t border-line py-10 text-muted">
            No standings for this year yet. Signed-in Game of the Year lists
            will appear here as they are saved.
          </p>
        ) : (
          <ol>
            {page.goty.map((row) => (
              <StandingsRow key={row.gameId} row={row} revealed={revealed} />
            ))}
          </ol>
        )}
        <GotyPager page={page} />
      </section>

      {page.categories.map((block) => (
        <CategoryBlock key={block.categoryId} block={block} revealed={revealed} />
      ))}

      <p className="mt-14 text-sm text-muted">
        Building your own list?{" "}
        <Link href="/create/goty" className="text-accent hover:underline">
          Create a Game of the Year ranking
        </Link>
        .
      </p>
    </main>
  );
}
