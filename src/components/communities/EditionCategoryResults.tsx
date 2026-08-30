import Link from "next/link";
import { type ReactNode } from "react";
import {
  StandingGameCard,
  StandingGameCardGrid,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryMeta,
  EditionCategoryStandingBlock,
  EditionCategoryStandingRow,
} from "@/lib/communities/edition-results";
import {
  editionCategoryStandingsHref,
  editionResultsHref,
} from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

function CategoryChapterHeader({
  label,
  description,
  showRule,
  compact = false,
  action,
}: {
  label: string;
  description?: string | null;
  /** Accent-led chapter break above the masthead (skip for the first award). */
  showRule?: boolean;
  /** Tighter type + rule for GOTY rank chapters. */
  compact?: boolean;
  action?: ReactNode;
}) {
  return (
    <header>
      {showRule ? (
        <SectionRule className={compact ? "mb-3" : "mb-5 sm:mb-6"} />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h3
          className={
            compact
              ? "line-clamp-2 font-display text-2xl leading-none tracking-wide text-ink sm:text-3xl"
              : "line-clamp-2 font-display text-4xl leading-none tracking-wide text-ink sm:text-5xl"
          }
        >
          {label}
        </h3>
        {action}
      </div>
      {description ? (
        <p
          className={
            compact
              ? "mt-1.5 line-clamp-2 max-w-xl font-serif text-sm leading-relaxed text-muted"
              : "mt-2 line-clamp-2 max-w-xl font-serif text-base leading-relaxed text-muted sm:text-lg"
          }
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}

export { CategoryChapterHeader };

/** Paginated cover-card tallies for one award (`?view=category`). */
export function EditionCategoryDetail({
  slug,
  year,
  mode,
  category,
  page,
  pageSize,
  total,
  totalPages,
  rows,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  category: EditionCategoryMeta;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionCategoryStandingRow[];
}) {
  const categoriesHref = editionResultsHref(slug, year, {
    mode,
    view: "categories",
  });
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  return (
    <section>
      <Link
        href={categoriesHref}
        className="text-sm text-muted transition-colors hover:text-accent"
      >
        ← Categories
      </Link>
      <div className="mt-4">
        <CategoryChapterHeader
          label={category.label}
          description={category.description}
        />
        <p className="mt-2 text-sm text-muted">
          {category.total} game{category.total === 1 ? "" : "s"}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No scores for this award yet.
        </p>
      ) : (
        <>
          <StandingGameCardGrid>
            {rows.map((row) => (
              <li key={row.gameId}>
                <StandingGameCard
                  place={row.rank}
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  points={row.votes}
                  scoreUnit="votes"
                />
              </li>
            ))}
          </StandingGameCardGrid>
          {totalPages > 1 ? (
            <nav
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
              aria-label="Category standings pages"
            >
              <p className="text-muted">
                {rangeFrom}–{rangeTo} of {total} · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={editionCategoryStandingsHref(
                      slug,
                      year,
                      category.categoryId,
                      { mode, page: page - 1 },
                    )}
                    className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="border border-line px-3 py-1.5 text-muted/50">
                    Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={editionCategoryStandingsHref(
                      slug,
                      year,
                      category.categoryId,
                      { mode, page: page + 1 },
                    )}
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
          ) : null}
        </>
      )}
    </section>
  );
}

/** Categories tab: top 3 per award + link to full category standings. */
export function EditionCategoryResults({
  slug,
  year,
  mode,
  categoryPodiums,
  showFullStandingsLinks = true,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  categoryPodiums: EditionCategoryStandingBlock[];
  /** Host closed preview: hide links to unpublished category detail. */
  showFullStandingsLinks?: boolean;
}) {
  if (categoryPodiums.length === 0) {
    return (
      <section>
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Categories
        </h3>
        <p className="mt-4 text-sm text-muted">
          No category results for this board yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Categories
      </h3>
      <div className="mt-8">
        {categoryPodiums.map((cat, index) => {
          const fullHref = editionCategoryStandingsHref(
            slug,
            year,
            cat.categoryId,
            { mode },
          );
          return (
            <article
              key={cat.categoryId}
              className={index === 0 ? undefined : "mt-8 sm:mt-10"}
            >
              <CategoryChapterHeader
                label={cat.label}
                description={cat.description}
                showRule={index > 0}
                action={
                  showFullStandingsLinks ? (
                    <Link
                      href={fullHref}
                      className="text-sm text-accent hover:underline"
                    >
                      View full category standings
                    </Link>
                  ) : null
                }
              />
              {cat.rows.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  No scores for this award yet.
                </p>
              ) : (
                <HorizontalScroll
                  className="mt-4"
                  label={`${cat.label} ranked`}
                >
                  <ul className={standingStripListClass}>
                    {cat.rows.map((row) => (
                      <li
                        key={row.gameId}
                        className={standingStripColClass(row.rank === 1)}
                      >
                        <StandingGameCard
                          place={row.rank}
                          placeSize="lg"
                          slug={row.slug}
                          title={row.title}
                          coverUrl={row.coverUrl}
                          points={row.votes}
                          scoreUnit="votes"
                          priority={row.rank === 1}
                          pinCover
                        />
                      </li>
                    ))}
                  </ul>
                </HorizontalScroll>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
