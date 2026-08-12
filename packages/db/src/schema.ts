import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  year: integer("year"),
  firstReleaseDate: timestamp("first_release_date", { mode: "date" }),
  coverIgdbId: integer("cover_igdb_id"),
  gameTypeIgdbId: integer("game_type_igdb_id"),
  parentGameIgdbId: integer("parent_game_igdb_id"),
  versionParentIgdbId: integer("version_parent_igdb_id"),
  isAdult: boolean("is_adult").notNull().default(false),
  rating: integer("rating"),
  ratingCount: integer("rating_count"),
  follows: integer("follows"),
  hypes: integer("hypes"),
  popularity: integer("popularity").notNull().default(0),
  syncedAt: timestamp("synced_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const covers = pgTable("covers", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  imageId: text("image_id"),
  url: text("url"),
  width: integer("width"),
  height: integer("height"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const platforms = pgTable("platforms", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug"),
  abbreviation: text("abbreviation"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const genres = pgTable("genres", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const themes = pgTable("themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const keywords = pgTable("keywords", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const gameTypes = pgTable("game_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  type: text("type").notNull(),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const gamePlatforms = pgTable(
  "game_platforms",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    platformIgdbId: integer("platform_igdb_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.platformIgdbId] })],
);

export const gameGenres = pgTable(
  "game_genres",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    genreIgdbId: integer("genre_igdb_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.genreIgdbId] })],
);

export const gameThemes = pgTable(
  "game_themes",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    themeIgdbId: integer("theme_igdb_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.themeIgdbId] })],
);

export const gameKeywords = pgTable(
  "game_keywords",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    keywordIgdbId: integer("keyword_igdb_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.keywordIgdbId] })],
);

/** Link via IGDB involved_company id; company_igdb_id + roles filled on IC enrich. */
export const gameCompanies = pgTable(
  "game_companies",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    involvedCompanyIgdbId: integer("involved_company_igdb_id").notNull(),
    companyIgdbId: integer("company_igdb_id"),
    developer: boolean("developer").notNull().default(false),
    publisher: boolean("publisher").notNull().default(false),
    porting: boolean("porting").notNull().default(false),
    supporting: boolean("supporting").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.involvedCompanyIgdbId] })],
);

export const gameTimeToBeats = pgTable("game_time_to_beats", {
  gameIgdbId: integer("game_igdb_id").primaryKey(),
  hastily: integer("hastily"),
  normally: integer("normally"),
  completely: integer("completely"),
  syncedAt: timestamp("synced_at", { mode: "date" }),
});

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("running"),
  scope: jsonb("scope").$type<Record<string, unknown>>(),
  rowsProcessed: integer("rows_processed").notNull().default(0),
  pages: integer("pages").notNull().default(0),
  lastIgdbId: integer("last_igdb_id"),
  error: text("error"),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
});

/** App profile linked to Neon Auth user id. Access is app-layer (session + ownership), not RLS. */
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  visibility: text("visibility").notNull().default("public"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/** Public community that can later host live rankings and editions. */
export const communities = pgTable("communities", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdByProfileId: uuid("created_by_profile_id").references(
    () => profiles.id,
    { onDelete: "set null" },
  ),
  liveRankingsEnabled: boolean("live_rankings_enabled")
    .notNull()
    .default(false),
  /** When true, public live board reads frozen snapshots until unlocked. */
  liveRankingsLocked: boolean("live_rankings_locked").notNull().default(false),
  /** When set and reached, live scores are public for every year. Null = hidden. */
  liveScoresVisibleFrom: timestamp("live_scores_visible_from", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/** Open membership. role is internal (`admin` | `member`); public UI does not say admin. */
export const communityMembers = pgTable(
  "community_members",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.profileId] }),
    index("community_members_profile_id_idx").on(t.profileId),
  ],
);

/** Frozen community live board for one year while rankings are locked.
 * Normalized rows so page reads use SQL LIMIT — not a fat JSONB blob.
 */
export const communityLiveLockMeta = pgTable(
  "community_live_lock_meta",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    listCount: integer("list_count").notNull().default(0),
    gotyTotal: integer("goty_total").notNull().default(0),
    lockedAt: timestamp("locked_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.year] })],
);

export const communityLiveLockGoty = pgTable(
  "community_live_lock_goty",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    place: integer("place").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    gameYear: integer("game_year"),
    coverUrl: text("cover_url"),
    score: integer("score").notNull(),
    listMentions: integer("list_mentions").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.year, t.place] }),
    index("community_live_lock_goty_page_idx").on(
      t.communityId,
      t.year,
      t.place,
    ),
  ],
);

export const communityLiveLockCategoryRows = pgTable(
  "community_live_lock_category_rows",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    categoryId: text("category_id").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    place: integer("place").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    voteCount: integer("vote_count").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.communityId, t.year, t.categoryId, t.place],
    }),
    index("community_live_lock_category_rows_idx").on(
      t.communityId,
      t.year,
      t.categoryId,
    ),
  ],
);

/**
 * Year awards ceremony for a community.
 * Public status is computed from opensAt / closesAt / publishesAt (no stored status).
 */
export const communityEditions = pgTable(
  "community_editions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    opensAt: timestamp("opens_at", { mode: "date" }),
    closesAt: timestamp("closes_at", { mode: "date" }),
    publishesAt: timestamp("publishes_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("community_editions_community_id_year_uidx").on(
      t.communityId,
      t.year,
    ),
    index("community_editions_community_id_idx").on(t.communityId),
  ],
);

/**
 * Member GOTY ballot for one community edition.
 * Separate from personal `lists` and from live contrib.
 */
export const communityEditionBallots = pgTable(
  "community_edition_ballots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("community_edition_ballots_edition_profile_uidx").on(
      t.editionId,
      t.profileId,
    ),
    index("community_edition_ballots_edition_id_idx").on(t.editionId),
  ],
);

export const communityEditionBallotItems = pgTable(
  "community_edition_ballot_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ballotId: uuid("ballot_id")
      .notNull()
      .references(() => communityEditionBallots.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    blurb: text("blurb"),
  },
  (t) => [
    uniqueIndex("community_edition_ballot_items_ballot_rank_uidx").on(
      t.ballotId,
      t.rank,
    ),
    uniqueIndex("community_edition_ballot_items_ballot_game_uidx").on(
      t.ballotId,
      t.gameId,
    ),
  ],
);

/** Personal GOTY or custom ranked list. Owned lists use profile slug URLs; anon shares use publicId. */
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    editSecretHash: text("edit_secret_hash"),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    listType: text("list_type").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    slug: text("slug"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("lists_owned_goty_year_uidx")
      .on(t.profileId, t.year)
      .where(sql`${t.listType} = 'goty' AND ${t.profileId} IS NOT NULL`),
    uniqueIndex("lists_profile_slug_uidx")
      .on(t.profileId, t.slug)
      .where(sql`${t.profileId} IS NOT NULL AND ${t.slug} IS NOT NULL`),
  ],
);

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    blurb: text("blurb"),
  },
  (t) => [
    uniqueIndex("list_items_list_rank_uidx").on(t.listId, t.rank),
    uniqueIndex("list_items_list_game_uidx").on(t.listId, t.gameId),
  ],
);

/** Site-wide award category definitions (live GOTY category picks). */
export const awardCategories = pgTable("award_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** One game pick per category on an owned GOTY list. */
export const listCategoryVotes = pgTable(
  "list_category_votes",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.listId, t.categoryId] })],
);

/** Site award_categories single-choice picks on an edition ballot. */
export const communityEditionBallotCategoryVotes = pgTable(
  "community_edition_ballot_category_votes",
  {
    ballotId: uuid("ballot_id")
      .notNull()
      .references(() => communityEditionBallots.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ballotId, t.categoryId] })],
);

/** Per-edition Voice designation (year history; not a mutable member flag). */
export const communityEditionVoices = pgTable(
  "community_edition_voices",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    designatedAt: timestamp("designated_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    designatedByProfileId: uuid("designated_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.profileId] }),
    index("community_edition_voices_edition_id_idx").on(t.editionId),
  ],
);

/** Write-once edition results meta (no fat JSONB). */
export const communityEditionResultMeta = pgTable("community_edition_result_meta", {
  editionId: uuid("edition_id")
    .primaryKey()
    .references(() => communityEditions.id, { onDelete: "cascade" }),
  frozenAt: timestamp("frozen_at", { mode: "date" }).defaultNow().notNull(),
  ballotCountCommunity: integer("ballot_count_community").notNull().default(0),
  ballotCountVoices: integer("ballot_count_voices").notNull().default(0),
  gotyTotalCommunity: integer("goty_total_community").notNull().default(0),
  gotyTotalVoices: integer("goty_total_voices").notNull().default(0),
});

/** Frozen GOTY standings row. mode: community | voices (Combined reads community). */
export const communityEditionResultGoty = pgTable(
  "community_edition_result_goty",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    place: integer("place").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    gameYear: integer("game_year"),
    coverUrl: text("cover_url"),
    points: integer("points").notNull(),
    firstPlaceVotes: integer("first_place_votes").notNull().default(0),
    appearances: integer("appearances").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.mode, t.place] }),
    uniqueIndex("community_edition_result_goty_game_uidx").on(
      t.editionId,
      t.mode,
      t.gameId,
    ),
    index("community_edition_result_goty_page_idx").on(
      t.editionId,
      t.mode,
      t.place,
    ),
  ],
);

export const communityEditionResultCategories = pgTable(
  "community_edition_result_categories",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    place: integer("place").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    votes: integer("votes").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.editionId, t.mode, t.categoryId, t.place],
    }),
    index("community_edition_result_categories_idx").on(
      t.editionId,
      t.mode,
      t.categoryId,
    ),
  ],
);

export const communityEditionResultVoters = pgTable(
  "community_edition_result_voters",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    isVoice: boolean("is_voice").notNull().default(false),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.profileId] }),
    index("community_edition_result_voters_name_idx").on(
      t.editionId,
      t.displayName,
    ),
  ],
);

export const communityEditionResultVoterRanks = pgTable(
  "community_edition_result_voter_ranks",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.profileId, t.rank] }),
    index("community_edition_result_voter_ranks_voter_idx").on(
      t.editionId,
      t.profileId,
    ),
  ],
);

export const communityEditionResultVoterCategoryPicks = pgTable(
  "community_edition_result_voter_category_picks",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.profileId, t.categoryId] }),
  ],
);

/**
 * Scored top-10 facts for owned GOTY lists (scoring source of truth).
 * Site rollups and future community SUM both read from here.
 */
export const liveGotyContrib = pgTable(
  "live_goty_contrib",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    rank: integer("rank").notNull(),
    points: integer("points").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.listId, t.gameId] }),
    index("live_goty_contrib_year_game_idx").on(t.year, t.gameId),
    index("live_goty_contrib_year_profile_idx").on(t.year, t.profileId),
  ],
);

/** Category pick facts for owned GOTY lists. */
export const liveCategoryContrib = pgTable(
  "live_category_contrib",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.listId, t.categoryId] }),
    index("live_category_contrib_year_cat_game_idx").on(
      t.year,
      t.categoryId,
      t.gameId,
    ),
  ],
);

/** Disposable site GOTY rollup cache (absolute SUM from live_goty_contrib). */
export const liveGotyScores = pgTable(
  "live_goty_scores",
  {
    year: integer("year").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    listMentions: integer("list_mentions").notNull().default(0),
    rank1Count: integer("rank_1_count").notNull().default(0),
    rank2Count: integer("rank_2_count").notNull().default(0),
    rank3Count: integer("rank_3_count").notNull().default(0),
    rank4Count: integer("rank_4_count").notNull().default(0),
    rank5Count: integer("rank_5_count").notNull().default(0),
    rank6Count: integer("rank_6_count").notNull().default(0),
    rank7Count: integer("rank_7_count").notNull().default(0),
    rank8Count: integer("rank_8_count").notNull().default(0),
    rank9Count: integer("rank_9_count").notNull().default(0),
    rank10Count: integer("rank_10_count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.year, t.gameId] }),
    index("live_goty_scores_year_score_idx").on(
      t.year,
      t.score.desc(),
      t.gameId,
    ),
  ],
);

/** Disposable site category rollup cache. */
export const liveCategoryScores = pgTable(
  "live_category_scores",
  {
    year: integer("year").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    voteCount: integer("vote_count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.year, t.categoryId, t.gameId] })],
);

/** Per-year meta: reveal gate, generations, list count, refresh lock. */
export const liveGotyYearStats = pgTable("live_goty_year_stats", {
  year: integer("year").primaryKey(),
  listCount: integer("list_count").notNull().default(0),
  detailedStatsRevealed: boolean("detailed_stats_revealed")
    .notNull()
    .default(false),
  /** Bumped when contrib changes; scores catch up asynchronously. */
  contribGeneration: integer("contrib_generation").notNull().default(0),
  /** Set equal to contribGeneration when score refresh finishes successfully. */
  scoresGeneration: integer("scores_generation").notNull().default(0),
  /** Bumped only after a successful score refresh (cache key). */
  standingsVersion: integer("standings_version").notNull().default(0),
  refreshing: boolean("refreshing").notNull().default(false),
  refreshStartedAt: timestamp("refresh_started_at", { mode: "date" }),
});

/**
 * Durable dirty keys so saves can return before score refresh.
 * Enables absolute per-game SUM without contending on the save path.
 */
export const liveGotyDirtyGames = pgTable(
  "live_goty_dirty_games",
  {
    year: integer("year").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.year, t.gameId] })],
);

export const liveCategoryDirty = pgTable(
  "live_category_dirty",
  {
    year: integer("year").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.year, t.categoryId, t.gameId] })],
);
