import { sql } from "drizzle-orm";
import {
  createDb,
  type Db,
} from "@thegamies/db";
import { customResultDisplayTitle, customResultTallyKind } from "@/lib/communities/custom-category-types";
import {
  withDisplayRanks,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";
import type {
  EditionCategoryMeta,
  EditionCategoryStandingBlock,
} from "@/lib/communities/edition-results";

type StorageMode = "community" | "voices";

type SnapshotSide = {
  meta: EditionCategoryMeta[];
  podiums: EditionCategoryStandingBlock[];
};

export type EditionCategorySnapshot = Record<StorageMode, SnapshotSide>;

type SourceRow = {
  mode: StorageMode;
  categoryId: string;
  label: string;
  description: string | null;
  sortOrder: number;
  place: number;
  gameId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  imageUrl: string | null;
  votes: number;
  supportLinkUrl: string | null;
  isCommunity: boolean;
  answerType: string | null;
  total: number;
  displayRank: number;
};

function getDb(): Db {
  return createDb();
}

function asRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

function emptySide(): SnapshotSide {
  return { meta: [], podiums: [] };
}

/** Group a window-ranked category read into nav totals and podium rows. */
export function groupRankedCategoryRows(
  rows: SourceRow[],
  maxRank: number,
  rankMode: SharedRankMode,
): EditionCategorySnapshot {
  const snapshot: EditionCategorySnapshot = {
    community: emptySide(),
    voices: emptySide(),
  };
  const podiumBlocks = new Map<
    string,
    EditionCategoryStandingBlock & { sortOrder: number; mode: StorageMode }
  >();
  const metaByKey = new Map<string, EditionCategoryMeta & { mode: StorageMode }>();

  for (const row of rows) {
    const metaKey = `${row.mode}:${row.categoryId}`;
    if (!metaByKey.has(metaKey)) {
      metaByKey.set(metaKey, {
        mode: row.mode,
        categoryId: row.categoryId,
        label: row.isCommunity ? `${row.label} · Community` : row.label,
        description: row.description,
        sortOrder: row.sortOrder,
        total: row.total,
        ...(row.isCommunity
          ? {
              isCommunity: true as const,
              tallyKind: customResultTallyKind(row.answerType),
            }
          : {}),
      });
    }
    if (row.displayRank > maxRank) continue;
    let block = podiumBlocks.get(metaKey);
    if (!block) {
      block = {
        mode: row.mode,
        categoryId: row.categoryId,
        label: row.isCommunity ? `${row.label} · Community` : row.label,
        description: row.description,
        ...(row.isCommunity ? { isCommunity: true as const } : {}),
        sortOrder: row.sortOrder,
        rows: [],
      };
      podiumBlocks.set(metaKey, block);
    }
    block.rows.push({
      place: row.place,
      rank: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.isCommunity
        ? customResultDisplayTitle(row.title, row.subtitle)
        : row.title,
      ...(row.isCommunity ? { subtitle: row.subtitle } : {}),
      coverUrl: row.isCommunity ? row.imageUrl || row.coverUrl : row.coverUrl,
      votes: row.votes,
      ...(row.isCommunity ? { supportLinkUrl: row.supportLinkUrl } : {}),
    });
  }

  for (const meta of metaByKey.values()) {
    snapshot[meta.mode].meta.push({
      categoryId: meta.categoryId,
      label: meta.label,
      description: meta.description,
      sortOrder: meta.sortOrder,
      total: meta.total,
      ...(meta.isCommunity
        ? { isCommunity: true, tallyKind: meta.tallyKind }
        : {}),
    });
  }
  const pendingPodiums: Array<
    EditionCategoryStandingBlock & { sortOrder: number; mode: StorageMode }
  > = [];
  for (const block of podiumBlocks.values()) {
    const ranked = withDisplayRanks(block.rows, (row) => row.votes, rankMode);
    pendingPodiums.push({
      mode: block.mode,
      categoryId: block.categoryId,
      label: block.label,
      description: block.description,
      ...(block.isCommunity ? { isCommunity: true } : {}),
      sortOrder: block.sortOrder,
      rows: ranked.filter((row) => row.rank <= maxRank),
    });
  }

  const bySort = (
    a: { sortOrder: number; categoryId: string },
    b: { sortOrder: number; categoryId: string },
  ) => a.sortOrder - b.sortOrder || a.categoryId.localeCompare(b.categoryId);

  for (const mode of ["community", "voices"] as const) {
    snapshot[mode].meta.sort(bySort);
    snapshot[mode].podiums = pendingPodiums
      .filter((block) => block.mode === mode)
      .sort(bySort)
      .map(({ sortOrder, mode: _mode, ...block }) => {
        void sortOrder;
        void _mode;
        return block;
      });
  }
  return snapshot;
}

function mapSource(
  row: Record<string, unknown>,
  isCommunity: boolean,
): SourceRow {
  const mode = row.mode === "voices" ? "voices" : "community";
  return {
    mode,
    categoryId: String(row.categoryId),
    label: String(row.label ?? ""),
    description: row.description == null ? null : String(row.description),
    sortOrder: Number(row.sortOrder),
    place: Number(row.place),
    gameId: String(row.gameId),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    subtitle: row.subtitle == null ? null : String(row.subtitle),
    coverUrl: row.coverUrl == null ? null : String(row.coverUrl),
    imageUrl: row.imageUrl == null ? null : String(row.imageUrl),
    votes: Number(row.votes),
    supportLinkUrl:
      row.supportLinkUrl == null ? null : String(row.supportLinkUrl),
    isCommunity,
    answerType: row.answerType == null ? null : String(row.answerType),
    total: Number(row.total),
    displayRank: Number(row.displayRank),
  };
}

/**
 * Site and community awards for one or both boards.
 * Two queries (site, custom), each covering every requested mode.
 * Totals and the top ranks come from the same window.
 */
export async function loadEditionCategorySnapshot(
  editionId: string,
  modes: StorageMode[],
  opts: { maxRank: number; rankMode?: SharedRankMode },
  db: Db = getDb(),
): Promise<EditionCategorySnapshot> {
  const unique = [...new Set(modes)];
  if (unique.length === 0) {
    return { community: emptySide(), voices: emptySide() };
  }
  const rankMode = opts.rankMode ?? "competition";
  const maxRank = Math.max(1, Math.floor(opts.maxRank));
  const modeList = sql.join(
    unique.map((mode) => sql`${mode}`),
    sql`, `,
  );
  const displayRank =
    rankMode === "dense"
      ? sql`dense_rank() over (partition by r.mode, r.category_id order by r.votes desc)`
      : sql`rank() over (partition by r.mode, r.category_id order by r.votes desc)`;

  const [siteResult, customResult] = await Promise.all([
    db.execute(sql`
      select
        mode,
        "categoryId",
        label,
        description,
        "sortOrder",
        place,
        "gameId",
        slug,
        title,
        subtitle,
        "coverUrl",
        "imageUrl",
        votes,
        "supportLinkUrl",
        "answerType",
        total,
        display_rank as "displayRank"
      from (
        select
          r.mode,
          r.category_id as "categoryId",
          r.label,
          r.description,
          r.sort_order as "sortOrder",
          r.place,
          r.game_id as "gameId",
          r.slug,
          r.title,
          null::text as subtitle,
          r.cover_url as "coverUrl",
          null::text as "imageUrl",
          r.votes,
          null::text as "supportLinkUrl",
          null::text as "answerType",
          count(*) over (partition by r.mode, r.category_id) as total,
          ${displayRank} as display_rank
        from community_edition_result_categories r
        inner join community_edition_categories cec
          on cec.edition_id = r.edition_id
         and cec.category_id = r.category_id
        where r.edition_id = ${editionId}
          and r.mode in (${modeList})
      ) ranked
      where display_rank <= ${maxRank}
    `),
    db.execute(sql`
      select
        mode,
        "categoryId",
        label,
        description,
        "sortOrder",
        place,
        "gameId",
        slug,
        title,
        subtitle,
        "coverUrl",
        "imageUrl",
        votes,
        "supportLinkUrl",
        "answerType",
        total,
        display_rank as "displayRank"
      from (
        select
          r.mode,
          r.category_id as "categoryId",
          r.label,
          r.description,
          r.sort_order as "sortOrder",
          r.place,
          coalesce(r.game_id, r.entry_id, r.category_id) as "gameId",
          coalesce(r.slug, '') as slug,
          r.title,
          r.subtitle,
          r.cover_url as "coverUrl",
          r.image_url as "imageUrl",
          r.votes,
          r.support_link_url as "supportLinkUrl",
          r.answer_type as "answerType",
          count(*) over (partition by r.mode, r.category_id) as total,
          ${displayRank} as display_rank
        from community_edition_result_custom_categories r
        where r.edition_id = ${editionId}
          and r.mode in (${modeList})
      ) ranked
      where display_rank <= ${maxRank}
    `),
  ]);

  const rows = [
    ...asRows(siteResult).map((row) => mapSource(row, false)),
    ...asRows(customResult).map((row) => mapSource(row, true)),
  ];
  return groupRankedCategoryRows(rows, maxRank, rankMode);
}
