import Link from "@/lib/next-link";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { ComparisonStripHeader } from "@/components/communities/ComparisonStripHeader";
import {
  comparisonColumnCount,
  comparisonStripTableClass,
  comparisonStripTableStyle,
} from "@/components/communities/comparison-strip";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import {
  EmptyStandingCard,
  StandingGameCard,
  standingCmpCellAwardClass,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { StandingStrip } from "@/components/communities/StandingStrip";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryComparisonMatrix,
  EditionCategoryComparisonRow,
  EditionCategoryStandingBlock,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import {
  editionCategoryStandingsHref,
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

function MatrixStandingCell({
  games,
}: {
  games: Array<{
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
}) {
  if (games.length === 0) {
    return <EmptyStandingCard />;
  }

  if (games.length === 1) {
    return <MatrixCardCell game={games[0]!} />;
  }

  return <CompactTieStack games={games} />;
}

function MatrixCardCell({
  game,
}: {
  game: {
    slug: string;
    title: string;
    coverUrl: string | null;
  } | null;
}) {
  if (!game) {
    return <EmptyStandingCard />;
  }
  return (
    <StandingGameCard
      slug={game.slug}
      title={game.title}
      coverUrl={game.coverUrl}
      size="sm"
    />
  );
}

function CategoryComparisonStrip({
  row,
  showYou,
  voiceColumns,
  slug,
  year,
  youBallotHref,
}: {
  row: EditionCategoryComparisonRow;
  showYou: boolean;
  voiceColumns: MatrixVoiceColumn[];
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  const columnCount = comparisonColumnCount(showYou, voiceColumns.length);

  return (
    <HorizontalScroll className="mt-4" label={`${row.label} comparison`}>
      <table
        className={comparisonStripTableClass(columnCount)}
        style={comparisonStripTableStyle(columnCount)}
      >
        <thead>
          <tr className="border-b border-line text-left">
            {showYou ? (
              <th scope="col" className={standingCmpCellAwardClass}>
                <ComparisonStripHeader href={youBallotHref}>You</ComparisonStripHeader>
              </th>
            ) : null}
            <th scope="col" className={standingCmpCellAwardClass}>
              <ComparisonStripHeader>Community</ComparisonStripHeader>
            </th>
            <th scope="col" className={standingCmpCellAwardClass}>
              <ComparisonStripHeader>Hosts</ComparisonStripHeader>
            </th>
            {voiceColumns.map((v) => (
              <th key={v.profileId} scope="col" className={standingCmpCellAwardClass}>
                <ComparisonStripHeader
                  title={`@${v.username}`}
                  href={editionVoterBallotHref(slug, year, v.username)}
                  person={{
                    displayName: v.displayName,
                    username: v.username,
                    avatarUrl: v.avatarUrl,
                  }}
                >
                  {v.displayName}
                </ComparisonStripHeader>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            {showYou ? (
              <td className={standingCmpCellAwardClass}>
                <MatrixCardCell game={row.you} />
              </td>
            ) : null}
            <td className={standingCmpCellAwardClass}>
              <MatrixStandingCell games={row.community} />
            </td>
            <td className={standingCmpCellAwardClass}>
              <MatrixStandingCell games={row.voices} />
            </td>
            {voiceColumns.map((v) => (
              <td key={v.profileId} className={standingCmpCellAwardClass}>
                <MatrixCardCell game={row.voiceGames[v.profileId] ?? null} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </HorizontalScroll>
  );
}

function CategoryComparisonSections({
  matrix,
  categoryPodiums,
  slug,
  year,
  mode,
  youBallotHref,
}: {
  matrix: EditionCategoryComparisonMatrix;
  categoryPodiums: EditionCategoryStandingBlock[];
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  youBallotHref: string | null;
}) {
  if (!matrix.hasGames || matrix.rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No category picks to compare yet.</p>
    );
  }

  const descriptions = new Map(
    categoryPodiums.map((c) => [c.categoryId, c.description]),
  );

  return (
    <div className="mt-6">
      {matrix.rows.map((row, index) => (
        <article
          key={row.categoryId}
          className={index === 0 ? undefined : "mt-8 sm:mt-10"}
        >
          <CategoryChapterHeader
            label={row.label}
            description={descriptions.get(row.categoryId) ?? null}
            showRule={index > 0}
            action={
              <Link
                href={editionCategoryStandingsHref(
                  slug,
                  year,
                  row.categoryId,
                  { mode },
                )}
                className="text-sm text-accent hover:underline"
              >
                Full standings
              </Link>
            }
          />
          <CategoryComparisonStrip
            row={row}
            showYou={matrix.showYou}
            voiceColumns={matrix.voiceColumns}
            slug={slug}
            year={year}
            youBallotHref={youBallotHref}
          />
        </article>
      ))}
    </div>
  );
}

/** Per-award Top 3 on one line; overflow uses StandingStrip (native scroll, mouse drag). */
function CategoryRankedSections({
  slug,
  year,
  mode,
  categories,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  categories: EditionCategoryStandingBlock[];
}) {
  if (categories.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No category scores for this mode.</p>
    );
  }

  return (
    <div className="mt-6">
      {categories.map((cat, index) => (
        <article
          key={cat.categoryId}
          className={index === 0 ? undefined : "mt-8 sm:mt-10"}
        >
          <CategoryChapterHeader
            label={cat.label}
            description={cat.description}
            showRule={index > 0}
            action={
              <Link
                href={editionCategoryStandingsHref(
                  slug,
                  year,
                  cat.categoryId,
                  { mode },
                )}
                className="text-sm text-accent hover:underline"
              >
                Full standings
              </Link>
            }
          />
          {cat.rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No scores for this award yet.
            </p>
          ) : (
            <StandingStrip className="mt-4" label={`${cat.label} ranked`}>
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
                      pinCover
                    />
                  </li>
                ))}
              </ul>
            </StandingStrip>
          )}
        </article>
      ))}
    </div>
  );
}

/**
 * Results Categories: ranked one-line strips or comparison chapters.
 */
export function EditionCategoriesHighlights({
  slug,
  year,
  mode = "community",
  categoryPodiums,
  categoryComparison,
  youBallotHref = null,
  layout = "ranked",
}: {
  slug: string;
  year: number;
  mode?: EditionResultsPublicMode;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref?: string | null;
  layout?: "ranked" | "comparison";
}) {
  if (categoryPodiums.length === 0 && !categoryComparison.hasGames) {
    return null;
  }

  return (
    <section>
      <SectionRule className="mb-6" />
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Categories
      </h3>

      {layout === "comparison" ? (
        <CategoryComparisonSections
          matrix={categoryComparison}
          categoryPodiums={categoryPodiums}
          slug={slug}
          year={year}
          mode={mode}
          youBallotHref={youBallotHref}
        />
      ) : (
        <CategoryRankedSections
          slug={slug}
          year={year}
          mode={mode}
          categories={categoryPodiums}
        />
      )}
    </section>
  );
}
