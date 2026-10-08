import { getCommunityBySlug } from "@/lib/communities/service";
import {
  editionForYear,
  listEditionsForCommunity,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import {
  CATEGORY_RANKED_TOP,
  ensurePublishedEditionResultsForEdition,
  getEditionCategoryResults,
  getEditionGotyThroughRank,
  type EditionCategoryStandingBlock,
  type EditionGotyStandingRow,
  type EditionResultsMeta,
} from "@/lib/communities/edition-results";
import type { EditionResultMode } from "@/lib/communities/edition-results-scoring";
import type { SharedRankMode } from "@/lib/standings/shared-rank";

export { editionForYear };

export async function loadEditionYearContext(
  slug: string,
  year: number,
  viewerProfileId?: string | null,
) {
  const community = await getCommunityBySlug(slug, viewerProfileId);
  if (!community) return null;
  const editions = await listEditionsForCommunity(community.id);
  return {
    community,
    editions,
    edition: editionForYear(editions, year),
  };
}

function publishedMeta(
  ensured: EditionResultsMeta | null | { error: string },
): EditionResultsMeta | null {
  if (!ensured || "error" in ensured) return null;
  return ensured;
}

/** Freeze bootstrap using the page's edition row; returns meta (no extra year lookup). */
export async function loadPublishedEditionMeta(
  edition: CommunityEditionPublic,
): Promise<EditionResultsMeta | null> {
  return publishedMeta(await ensurePublishedEditionResultsForEdition(edition));
}

export async function loadEditionResultsOverview(opts: {
  edition: CommunityEditionPublic;
  mode: EditionResultMode;
  rankMode: SharedRankMode;
  /** When the page already ran {@link loadPublishedEditionMeta}. */
  meta?: EditionResultsMeta | null;
}): Promise<{
  meta: EditionResultsMeta;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
} | null> {
  const meta = opts.meta ?? (await loadPublishedEditionMeta(opts.edition));
  if (!meta) return null;
  const [topTen, categoryPodiums] = await Promise.all([
    getEditionGotyThroughRank(opts.edition.id, opts.mode, {
      maxRank: 10,
      rankMode: opts.rankMode,
    }),
    getEditionCategoryResults(opts.edition.id, opts.mode, {
      maxRank: CATEGORY_RANKED_TOP,
      rankMode: opts.rankMode,
      skipCustomBackfill: true,
    }),
  ]);
  return { meta, topTen, categoryPodiums };
}
