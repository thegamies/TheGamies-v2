import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@thegamies/db";

/**
 * Edition freeze writes, computed in Postgres and applied in one transaction
 * (`db.batch` on neon-http is a single request). A cut-off Worker leaves either
 * the previous snapshot or the new one, never a partial board.
 *
 * Board order matches `placeEditionGotyTallies` / `placeEditionCategoryTallies`:
 *   GOTY — points, #1 votes, appearances desc, then game id.
 *   Categories — votes desc, then game id.
 *   Community awards — votes desc, then entry id (or game id).
 * Uuid order equals JS string order for lowercase ids.
 */

export type FreezeMode = "community" | "voices";

const COVER_URL_PREFIX = "https://images.igdb.com/igdb/image/upload/t_cover_big/";

function coverUrl(imageIdColumn: SQL): SQL {
  return sql`CASE WHEN nullif(${imageIdColumn}, '') IS NULL THEN NULL
    ELSE ${COVER_URL_PREFIX} || ${imageIdColumn} || '.jpg' END`;
}

function voicesOnly(mode: FreezeMode): SQL {
  return mode === "voices"
    ? sql`AND EXISTS (
        SELECT 1 FROM community_edition_voices ev
        WHERE ev.edition_id = b.edition_id AND ev.profile_id = b.profile_id
      )`
    : sql``;
}

function gotySelect(editionId: string, mode: FreezeMode): SQL {
  return sql`
    SELECT
      ${editionId}::uuid AS edition_id,
      ${mode}::text AS mode,
      (row_number() OVER (
        ORDER BY t.points DESC, t.first_place_votes DESC, t.appearances DESC, t.game_id
      ))::int AS place,
      t.game_id, t.slug, t.title, t.game_year, t.cover_url,
      t.points, t.first_place_votes, t.appearances
    FROM (
      SELECT
        i.game_id, g.slug, g.title, g.year AS game_year,
        ${coverUrl(sql`c.image_id`)} AS cover_url,
        sum(11 - i.rank)::int AS points,
        (count(*) FILTER (WHERE i.rank = 1))::int AS first_place_votes,
        count(*)::int AS appearances
      FROM community_edition_ballot_items i
      JOIN community_edition_ballots b ON b.id = i.ballot_id
      JOIN games g ON g.id = i.game_id
      LEFT JOIN covers c ON c.igdb_id = g.cover_igdb_id
      WHERE b.edition_id = ${editionId}
        AND i.rank BETWEEN 1 AND 10
        ${voicesOnly(mode)}
      GROUP BY i.game_id, g.slug, g.title, g.year, c.image_id
      HAVING sum(11 - i.rank) > 0
    ) t`;
}

/** Only categories enabled for the edition are frozen. */
function categorySelect(editionId: string, mode: FreezeMode): SQL {
  return sql`
    SELECT
      ${editionId}::uuid AS edition_id,
      ${mode}::text AS mode,
      t.category_id, ac.label, ac.description, ec.sort_order,
      (row_number() OVER (
        PARTITION BY t.category_id ORDER BY t.votes DESC, t.game_id
      ))::int AS place,
      t.game_id, t.slug, t.title, t.cover_url, t.votes
    FROM (
      SELECT
        v.category_id, v.game_id, g.slug, g.title,
        ${coverUrl(sql`c.image_id`)} AS cover_url,
        count(*)::int AS votes
      FROM community_edition_ballot_category_votes v
      JOIN community_edition_ballots b ON b.id = v.ballot_id
      JOIN games g ON g.id = v.game_id
      LEFT JOIN covers c ON c.igdb_id = g.cover_igdb_id
      WHERE b.edition_id = ${editionId}
        ${voicesOnly(mode)}
      GROUP BY v.category_id, v.game_id, g.slug, g.title, c.image_id
    ) t
    JOIN community_edition_categories ec
      ON ec.edition_id = ${editionId} AND ec.category_id = t.category_id
    JOIN award_categories ac ON ac.id = t.category_id`;
}

/** Entry picks resolve their game through the entry; any-game picks use the vote's game. */
function customSelect(editionId: string, mode: FreezeMode): SQL {
  return sql`
    SELECT
      ${editionId}::uuid AS edition_id,
      ${mode}::text AS mode,
      t.category_id, cc.name AS label, cc.description, cc.answer_type, cc.sort_order,
      (row_number() OVER (
        PARTITION BY t.category_id
        ORDER BY t.votes DESC, coalesce(t.entry_id::text, t.game_id::text, '') COLLATE "C"
      ))::int AS place,
      t.entry_id, t.game_id, t.slug, t.title, t.subtitle, t.image_url, t.cover_url,
      t.support_link_url, t.support_link_kind, t.votes
    FROM (
      SELECT
        v.category_id,
        v.entry_id,
        coalesce(v.game_id, g.id) AS game_id,
        g.slug,
        CASE WHEN v.entry_id IS NOT NULL THEN coalesce(e.title, 'Entry')
          ELSE coalesce(g.title, 'Game') END AS title,
        CASE WHEN v.entry_id IS NOT NULL THEN g.title END AS subtitle,
        e.image_url,
        ${coverUrl(sql`c.image_id`)} AS cover_url,
        e.support_link_url,
        e.support_link_kind,
        count(*)::int AS votes
      FROM community_edition_ballot_custom_category_votes v
      JOIN community_edition_ballots b ON b.id = v.ballot_id
      LEFT JOIN community_custom_category_entries e ON e.id = v.entry_id
      LEFT JOIN games g ON g.id = coalesce(v.game_id, e.game_id)
      LEFT JOIN covers c ON c.igdb_id = g.cover_igdb_id
      WHERE b.edition_id = ${editionId}
        ${voicesOnly(mode)}
      GROUP BY v.category_id, v.game_id, v.entry_id, e.title, e.image_url,
        e.support_link_url, e.support_link_kind, g.id, g.title, g.slug, c.image_id
    ) t
    JOIN community_custom_categories cc
      ON cc.id = t.category_id AND cc.edition_id = ${editionId}`;
}

/** `INSERT … SELECT` over one select per mode, optionally gated by `guard`. */
function insertModes(
  table: string,
  columns: SQL,
  build: (editionId: string, mode: FreezeMode) => SQL,
  editionId: string,
  modes: FreezeMode[],
  guard?: SQL,
): SQL {
  const union = sql.join(
    modes.map((mode) => sql`(${build(editionId, mode)})`),
    sql` UNION ALL `,
  );
  return sql`
    INSERT INTO ${sql.identifier(table)} (${columns})
    SELECT ${columns} FROM (${union}) s
    ${guard ? sql`WHERE ${guard}` : sql``}`;
}

const GOTY_COLUMNS = sql`
  edition_id, mode, place, game_id, slug, title, game_year, cover_url,
  points, first_place_votes, appearances`;

const CATEGORY_COLUMNS = sql`
  edition_id, mode, category_id, label, description, sort_order, place,
  game_id, slug, title, cover_url, votes`;

const CUSTOM_COLUMNS = sql`
  edition_id, mode, category_id, label, description, answer_type, sort_order, place,
  entry_id, game_id, slug, title, subtitle, image_url, cover_url,
  support_link_url, support_link_kind, votes`;

function insertGoty(editionId: string, modes: FreezeMode[], guard?: SQL): SQL {
  return insertModes(
    "community_edition_result_goty",
    GOTY_COLUMNS,
    gotySelect,
    editionId,
    modes,
    guard,
  );
}

function insertCategories(editionId: string, modes: FreezeMode[], guard?: SQL): SQL {
  return insertModes(
    "community_edition_result_categories",
    CATEGORY_COLUMNS,
    categorySelect,
    editionId,
    modes,
    guard,
  );
}

function insertCustom(editionId: string, modes: FreezeMode[], guard?: SQL): SQL {
  return insertModes(
    "community_edition_result_custom_categories",
    CUSTOM_COLUMNS,
    customSelect,
    editionId,
    modes,
    guard,
  );
}

function isVoiceExpr(editionId: string, profileIdColumn: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM community_edition_voices ev
    WHERE ev.edition_id = ${editionId} AND ev.profile_id = ${profileIdColumn}
  )`;
}

function deleteResults(table: string, editionId: string, mode?: FreezeMode): SQL {
  return sql`DELETE FROM ${sql.identifier(table)} WHERE edition_id = ${editionId}
    ${mode ? sql`AND mode = ${mode}` : sql``}`;
}

export type FreezeMetaRow = {
  frozenAt: Date;
  ballotCountCommunity: number;
  ballotCountVoices: number;
  gotyTotalCommunity: number;
  gotyTotalVoices: number;
};

type RawMetaRow = {
  frozen_at_ms: number;
  ballot_count_community: number;
  ballot_count_voices: number;
  goty_total_community: number;
  goty_total_voices: number;
};

function metaFromRows(rows: unknown[]): FreezeMetaRow | null {
  const row = rows[0] as RawMetaRow | undefined;
  if (!row) return null;
  return {
    frozenAt: new Date(Number(row.frozen_at_ms)),
    ballotCountCommunity: Number(row.ballot_count_community),
    ballotCountVoices: Number(row.ballot_count_voices),
    gotyTotalCommunity: Number(row.goty_total_community),
    gotyTotalVoices: Number(row.goty_total_voices),
  };
}

/** `frozen_at` is a UTC timestamp without zone, read the same way drizzle reads it. */
const META_RETURNING = sql`RETURNING
  (extract(epoch FROM frozen_at) * 1000)::float8 AS frozen_at_ms,
  ballot_count_community, ballot_count_voices, goty_total_community, goty_total_voices`;

/**
 * Full snapshot in one transaction. Clears any rows left for the edition first
 * (legacy partial freezes); `replaceMeta` also drops the existing meta so a
 * rebuild swaps the whole snapshot atomically. Without it, an existing meta row
 * (a concurrent freeze that won) makes the insert fail and nothing changes.
 */
export async function writeEditionFreezeSnapshot(
  editionId: string,
  db: Db,
  opts: { replaceMeta: boolean },
): Promise<FreezeMetaRow> {
  const modes: FreezeMode[] = ["community", "voices"];
  const results = await db.batch([
    db.execute(deleteResults("community_edition_result_voter_category_picks", editionId)),
    db.execute(deleteResults("community_edition_result_voter_ranks", editionId)),
    db.execute(deleteResults("community_edition_result_voters", editionId)),
    db.execute(deleteResults("community_edition_result_categories", editionId)),
    db.execute(deleteResults("community_edition_result_custom_categories", editionId)),
    db.execute(deleteResults("community_edition_result_goty", editionId)),
    ...(opts.replaceMeta
      ? [db.execute(deleteResults("community_edition_result_meta", editionId))]
      : []),
    db.execute(insertGoty(editionId, modes)),
    db.execute(insertCategories(editionId, modes)),
    db.execute(insertCustom(editionId, modes)),
    db.execute(sql`
      INSERT INTO community_edition_result_voters (
        edition_id, profile_id, is_voice, display_name, username
      )
      SELECT ${editionId}, b.profile_id, ${isVoiceExpr(editionId, sql`b.profile_id`)},
        p.display_name, p.username
      FROM community_edition_ballots b
      JOIN profiles p ON p.id = b.profile_id
      WHERE b.edition_id = ${editionId}`),
    db.execute(sql`
      INSERT INTO community_edition_result_meta (
        edition_id, ballot_count_community, ballot_count_voices,
        goty_total_community, goty_total_voices
      )
      SELECT
        ${editionId},
        (SELECT count(*) FROM community_edition_result_voters WHERE edition_id = ${editionId})::int,
        (SELECT count(*) FROM community_edition_result_voters
          WHERE edition_id = ${editionId} AND is_voice)::int,
        (SELECT count(*) FROM community_edition_result_goty
          WHERE edition_id = ${editionId} AND mode = 'community')::int,
        (SELECT count(*) FROM community_edition_result_goty
          WHERE edition_id = ${editionId} AND mode = 'voices')::int
      ${META_RETURNING}`),
  ]);
  const meta = metaFromRows(results[results.length - 1].rows);
  if (!meta) throw new Error("Could not freeze edition results.");
  return meta;
}

/**
 * Hosts board only, in one transaction: replace `voices` rows, refresh voter
 * Host flags and the Hosts counts. Community rows are untouched. Returns null
 * when the edition has no freeze (nothing is written then).
 */
export async function rewriteEditionHostsSnapshot(
  editionId: string,
  db: Db,
): Promise<FreezeMetaRow | null> {
  const modes: FreezeMode[] = ["voices"];
  const frozen = sql`EXISTS (
    SELECT 1 FROM community_edition_result_meta WHERE edition_id = ${editionId}
  )`;
  const results = await db.batch([
    db.execute(deleteResults("community_edition_result_goty", editionId, "voices")),
    db.execute(deleteResults("community_edition_result_categories", editionId, "voices")),
    db.execute(deleteResults("community_edition_result_custom_categories", editionId, "voices")),
    db.execute(insertGoty(editionId, modes, frozen)),
    db.execute(insertCategories(editionId, modes, frozen)),
    db.execute(insertCustom(editionId, modes, frozen)),
    db.execute(sql`
      UPDATE community_edition_result_voters r
      SET is_voice = ${isVoiceExpr(editionId, sql`r.profile_id`)}
      WHERE r.edition_id = ${editionId}`),
    db.execute(sql`
      UPDATE community_edition_result_meta
      SET
        ballot_count_voices = (
          SELECT count(*) FROM community_edition_ballots b
          WHERE b.edition_id = ${editionId} ${voicesOnly("voices")}
        )::int,
        goty_total_voices = (
          SELECT count(*) FROM community_edition_result_goty
          WHERE edition_id = ${editionId} AND mode = 'voices'
        )::int
      WHERE edition_id = ${editionId}
      ${META_RETURNING}`),
  ]);
  return metaFromRows(results[results.length - 1].rows);
}

/**
 * Fills community-award rows for an edition frozen before those votes existed.
 * One statement; a no-op unless the edition is frozen and has no award rows.
 */
export async function backfillCustomCategoryFreeze(editionId: string, db: Db): Promise<void> {
  await db.execute(
    insertCustom(
      editionId,
      ["community", "voices"],
      sql`EXISTS (SELECT 1 FROM community_edition_result_meta WHERE edition_id = ${editionId})
        AND NOT EXISTS (
          SELECT 1 FROM community_edition_result_custom_categories WHERE edition_id = ${editionId}
        )`,
    ),
  );
}
