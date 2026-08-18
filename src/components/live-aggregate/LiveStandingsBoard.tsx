import type { ReactNode } from "react";
import Link from "next/link";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import {
  LiveCategoriesPanel,
  LiveCategoryDetailPanel,
} from "@/components/live-aggregate/LiveCategoriesPanel";
import { RankingsInfoControl } from "@/components/standings/RankingsInfoControl";
import { YearSelect } from "@/components/ui/YearSelect";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import type {
  StandingsGameRow,
  StandingsPage,
} from "@/lib/live-aggregate/service";
import {
  standingsQueryString,
  type LiveStandingsViewId,
  type StandingsCategoryGroupFilter,
} from "@/lib/live-aggregate/award-category-defs";

export function liveStandingsHref(
  basePath: string,
  opts: {
    page?: number;
    group?: StandingsCategoryGroupFilter;
    view?: LiveStandingsViewId;
    category?: string | null;
  } = {},
): string {
  return `${basePath}${standingsQueryString(opts)}`;
}

function GotyPager({
  page,
  basePath,
}: {
  page: StandingsPage;
  basePath: string;
}) {
  if (page.gotyTotal <= page.pageSize) return null;

  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.page * page.pageSize, page.gotyTotal);

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
      aria-label="Standings pages"
    >
      <p className="text-muted">
        {from}–{to} of {page.gotyTotal} · page {page.page} of {page.totalPages}
      </p>
      <div className="flex gap-2">
        {page.page > 1 ? (
          <Link
            href={liveStandingsHref(basePath, {
              page: page.page - 1,
              group: page.categoryGroup,
              view: "goty",
            })}
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
            href={liveStandingsHref(basePath, {
              page: page.page + 1,
              group: page.categoryGroup,
              view: "goty",
            })}
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

function GotyGrid({
  rows,
  revealed,
  empty,
}: {
  rows: StandingsGameRow[];
  revealed: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-muted">{empty}</p>;
  }

  return (
    <StandingGameCardGrid density="tight">
      {rows.map((row) => (
        <li key={row.gameId}>
          <StandingGameCard
            place={row.place}
            slug={row.slug}
            title={row.title}
            coverUrl={row.coverUrl}
            points={revealed ? row.score : null}
          />
        </li>
      ))}
    </StandingGameCardGrid>
  );
}

function LiveStandingsViewNav({
  basePath,
  page,
}: {
  basePath: string;
  page: StandingsPage;
}) {
  const views: Array<{ id: LiveStandingsViewId; label: string }> = [
    { id: "goty", label: "Game of the Year" },
    { id: "categories", label: "Categories" },
  ];
  const categoriesActive =
    page.view === "categories" || page.view === "category";

  return (
    <ScrollableNav aria-label="Standings view" className="mt-5">
      {views.map((v) => {
        const active =
          v.id === "categories" ? categoriesActive : page.view === v.id;
        return (
          <Link
            key={v.id}
            href={liveStandingsHref(basePath, {
              group: page.categoryGroup,
              view: v.id,
            })}
            className={navItemClass("secondary", active)}
          >
            {v.label}
          </Link>
        );
      })}
    </ScrollableNav>
  );
}

export type LiveStandingsBoardProps = {
  page: StandingsPage;
  yearOptions: number[];
  /** Path without query, e.g. `/game-of-the-year/2026`. */
  basePath: string;
  title: string;
  /** Short meta under the title — typically list count. */
  listCountLabel?: string | null;
  statusNotes?: string[];
  emptyGoty: string;
  emptyCategories: string;
  /** Site GOTY uses h1; community Live sits under CommunityHeader h1. */
  headingLevel?: "h1" | "h2";
  /** Footer CTA (site GOTY only). */
  footer?: ReactNode;
  /** Site GOTY explain control. Omit on community Live. */
  showRankingsInfo?: boolean;
};

/**
 * Shared live standings board for site GOTY and community Live Rankings:
 * year select top-right, GOTY / Categories secondary switch, cover-card grid.
 */
export function LiveStandingsBoard({
  page,
  yearOptions,
  basePath,
  title,
  listCountLabel,
  statusNotes = [],
  emptyGoty,
  emptyCategories,
  headingLevel = "h1",
  footer,
  showRankingsInfo = false,
}: LiveStandingsBoardProps) {
  const revealed = page.detailedStatsRevealed;
  const yearBase = (y: number) => {
    const parts = basePath.split("/");
    parts[parts.length - 1] = String(y);
    return parts.join("/");
  };
  const yearOptionsLinks = yearOptions.map((y) => ({
    year: y,
    href: liveStandingsHref(yearBase(y), {
      group: page.categoryGroup,
      view: page.view,
      category: page.categoryId,
    }),
  }));
  const Heading = headingLevel;
  const detailBlock = page.categories[0] ?? null;

  return (
    <>
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-baseline gap-3">
            <Heading className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
              {title}
            </Heading>
            {showRankingsInfo ? <RankingsInfoControl /> : null}
          </div>
          <YearSelect
            year={page.year}
            options={yearOptionsLinks}
            alwaysShow
            label="Standings year"
          />
        </div>
        {listCountLabel ? (
          <p className="mt-2 text-sm text-muted">{listCountLabel}</p>
        ) : null}
        {statusNotes.map((note) => (
          <p key={note} className="mt-2 max-w-2xl text-sm text-muted" role="status">
            {note}
          </p>
        ))}
      </header>

      <LiveStandingsViewNav basePath={basePath} page={page} />

      {page.view === "category" ? (
        <section className="mt-6">
          <LiveCategoryDetailPanel
            hrefBase={basePath}
            group={page.categoryGroup}
            block={detailBlock}
            revealed={revealed}
            page={page.page}
            pageSize={page.pageSize}
            totalPages={page.totalPages}
            gameTotal={page.categoryGameTotal}
            empty={emptyCategories}
          />
        </section>
      ) : page.view === "categories" ? (
        <section className="mt-6">
          <LiveCategoriesPanel
            key={`${page.categoryGroup}-${page.year}`}
            hrefBase={basePath}
            group={page.categoryGroup}
            categories={page.categories}
            revealed={revealed}
            empty={emptyCategories}
          />
        </section>
      ) : (
        <section className="mt-6">
          <GotyGrid rows={page.goty} revealed={revealed} empty={emptyGoty} />
          <GotyPager page={page} basePath={basePath} />
        </section>
      )}

      {footer}
    </>
  );
}
