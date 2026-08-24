import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
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
  /** Set when IGDB removes the title; cleared on create/update webhooks. */
  igdbRemovedAt: timestamp("igdb_removed_at", { mode: "date" }),
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

/** IGDB webhook deliveries — written during queue drain, not on ingress. */
export const igdbWebhookEvents = pgTable(
  "igdb_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receivedAt: timestamp("received_at", { mode: "date" }).notNull(),
    processedAt: timestamp("processed_at", { mode: "date" }),
    entity: text("entity"),
    method: text("method"),
    igdbId: integer("igdb_id"),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    payload: jsonb("payload").$type<unknown>(),
    queueMessageId: text("queue_message_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("igdb_webhook_events_status_received_idx").on(
      t.status,
      t.receivedAt,
    ),
    index("igdb_webhook_events_received_idx").on(t.receivedAt),
  ],
);

/** App profile linked to Neon Auth user id. Access is app-layer (session + ownership), not RLS. */
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>(),
  visibility: text("visibility").notNull().default("public"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  /** Set when the public handle changes; NULL means the next rename is allowed immediately. */
  usernameChangedAt: timestamp("username_changed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/** Community that hosts live rankings and editions. Default visibility is private. */
export const communities = pgTable(
  "communities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    avatarUrl: text("avatar_url"),
    bannerUrl: text("banner_url"),
    socialLinks: jsonb("social_links").$type<Record<string, string>>(),
    /** `private` (invite) or `public` (discoverable + open join). */
    visibility: text("visibility").notNull().default("private"),
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
    liveScoresVisibleFrom: timestamp("live_scores_visible_from", {
      mode: "date",
    }),
    /** Current join code. Rotating replaces it and retires the old link. */
    inviteCode: text("invite_code").notNull().unique(),
    /** When true, members can copy the invite from the community header. */
    openInvites: boolean("open_invites").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("communities_visibility_name_idx").on(t.visibility, t.name),
  ],
);

/** Invite-only membership. role is internal (`admin` | `member`); public UI does not say admin. */
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

/**
 * Community-level Host designation (Promote / Retire).
 * Current Hosts have `retired_at` null. Year snapshots stay on
 * `community_edition_voices` and `tga_community_hosts`.
 */
export const communityHosts = pgTable(
  "community_hosts",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    promotedAt: timestamp("promoted_at", { mode: "date" }).defaultNow().notNull(),
    promotedByProfileId: uuid("promoted_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
    retiredAt: timestamp("retired_at", { mode: "date" }),
    retiredByProfileId: uuid("retired_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.profileId] }),
    index("community_hosts_current_idx")
      .on(t.communityId)
      .where(sql`${t.retiredAt} is null`),
  ],
);

/** Blocks invite rejoin until an admin removes the ban. */
export const communityBans = pgTable(
  "community_bans",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bannedByProfileId: uuid("banned_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
    bannedAt: timestamp("banned_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.profileId] }),
    index("community_bans_profile_id_idx").on(t.profileId),
  ],
);

/** Admin-submitted request to remove a community (ops fulfill; no self-serve wipe). */
export const communityDeletionRequests = pgTable(
  "community_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    requestedByProfileId: uuid("requested_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("community_deletion_requests_pending_community_uidx")
      .on(t.communityId)
      .where(sql`${t.status} = 'pending'`),
    index("community_deletion_requests_status_idx").on(t.status),
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
    opensAt: timestamp("opens_at", { withTimezone: true, mode: "date" }),
    closesAt: timestamp("closes_at", { withTimezone: true, mode: "date" }),
    publishesAt: timestamp("publishes_at", { withTimezone: true, mode: "date" }),
    /** Displayed tie numbering. Not a viewer chooser. */
    rankMode: text("rank_mode")
      .notNull()
      .default("dense")
      .$type<"competition" | "dense">(),
    /**
     * Results freeze job: idle until close, then pending → computing → ready|failed.
     * Ready also implies `community_edition_result_meta` exists.
     */
    freezeStatus: text("freeze_status")
      .notNull()
      .default("idle")
      .$type<"idle" | "pending" | "computing" | "ready" | "failed">(),
    freezeStartedAt: timestamp("freeze_started_at", { mode: "date" }),
    freezeError: text("freeze_error"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("community_editions_community_id_year_uidx").on(
      t.communityId,
      t.year,
    ),
    index("community_editions_community_id_idx").on(t.communityId),
    index("community_editions_freeze_status_idx").on(t.freezeStatus),
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
      .references(() => profiles.id, { onDelete: "restrict" }),
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
    rankStyle: text("rank_style").notNull().default("chip"),
    showSuffix: boolean("show_suffix").notNull().default(false),
    listFormat: text("list_format").notNull().default("grid"),
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
  categoryGroup: text("category_group").notNull().default("premier"),
  eligibility: text("eligibility").notNull().default("current_year"),
  allowEditions: boolean("allow_editions").notNull().default(false),
});

/**
 * Site award categories enabled for one edition (subset + host order).
 * Empty until seeded — readers fall back to all active site categories.
 */
export const communityEditionCategories = pgTable(
  "community_edition_categories",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => communityEditions.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => awardCategories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.categoryId] }),
    index("community_edition_categories_edition_id_idx").on(t.editionId),
  ],
);

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
      .references(() => profiles.id, { onDelete: "restrict" }),
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
      .references(() => profiles.id, { onDelete: "restrict" }),
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
      .references(() => profiles.id, { onDelete: "restrict" }),
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
      .references(() => profiles.id, { onDelete: "restrict" }),
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

/**
 * Singleton site ops settings (landing featured standings years, tie numbering).
 * `landingStandingsYears` null/empty → default current + previous calendar year.
 * `rankMode` — competition (1–1–3) or dense (1–1–2) for site live boards.
 * `publicBoardMinLists` — GOTY years stay hidden until this many lists.
 * `publicBoardMinCategoryVotes` — a category board stays hidden until that award has this many votes.
 * `standingFillMinVisible` — temporary: covers in view on homepage / all-years strips (decimals peek).
 */
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  landingStandingsYears: integer("landing_standings_years").array(),
  rankMode: text("rank_mode")
    .notNull()
    .default("competition")
    .$type<"competition" | "dense">(),
  publicBoardMinLists: integer("public_board_min_lists").notNull().default(5),
  publicBoardMinCategoryVotes: integer("public_board_min_category_votes")
    .notNull()
    .default(5),
  standingFillMinVisible: real("standing_fill_min_visible")
    .notNull()
    .default(2.2),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/** One The Game Awards pick’em year (site slate + lock). */
export const tgaYears = pgTable(
  "tga_years",
  {
    year: integer("year").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    promoted: boolean("promoted").notNull().default(false),
    opensAt: timestamp("opens_at", { mode: "date" }),
    showStartsAt: timestamp("show_starts_at", { mode: "date" }),
    worldPremieresOfficial: integer("world_premieres_official"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tga_years_promoted_uidx")
      .on(t.promoted)
      .where(sql`${t.promoted} = true`),
  ],
);

export const tgaCategories = pgTable(
  "tga_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    kind: text("kind").notNull().$type<"game" | "other">(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("tga_categories_year_sort_idx").on(t.year, t.sortOrder)],
);

export const tgaNominees = pgTable(
  "tga_nominees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "restrict" }),
    imageUrl: text("image_url"),
  },
  (t) => [index("tga_nominees_year_idx").on(t.year)],
);

export const tgaCategoryNominees = pgTable(
  "tga_category_nominees",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => tgaCategories.id, { onDelete: "cascade" }),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => tgaNominees.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.nomineeId] }),
    index("tga_category_nominees_nominee_idx").on(t.nomineeId),
  ],
);

export const tgaWinners = pgTable("tga_winners", {
  categoryId: uuid("category_id")
    .primaryKey()
    .references(() => tgaCategories.id, { onDelete: "cascade" }),
  nomineeId: uuid("nominee_id")
    .notNull()
    .references(() => tgaNominees.id, { onDelete: "restrict" }),
  calledAt: timestamp("called_at", { mode: "date" }).defaultNow().notNull(),
});

export const tgaSiteSheets = pgTable(
  "tga_site_sheets",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    worldPremieresGuess: integer("world_premieres_guess"),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.year] })],
);

export const tgaSitePicks = pgTable(
  "tga_site_picks",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => tgaCategories.id, { onDelete: "cascade" }),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => tgaNominees.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.year, t.categoryId] }),
    index("tga_site_picks_category_idx").on(t.categoryId, t.nomineeId),
  ],
);

export const tgaSiteScores = pgTable(
  "tga_site_scores",
  {
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    wpDelta: integer("wp_delta"),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.year, t.profileId] }),
    index("tga_site_scores_board_idx").on(t.year, t.points, t.wpDelta),
  ],
);

export const tgaCommunityYears = pgTable(
  "tga_community_years",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.year] })],
);

/** Host snapshot for one community pick’em year (no Hosts board in v1). */
export const tgaCommunityHosts = pgTable(
  "tga_community_hosts",
  {
    communityId: uuid("community_id").notNull(),
    year: integer("year").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    designatedAt: timestamp("designated_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    designatedByProfileId: uuid("designated_by_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.year, t.profileId] }),
    foreignKey({
      columns: [t.communityId, t.year],
      foreignColumns: [tgaCommunityYears.communityId, tgaCommunityYears.year],
      name: "tga_community_hosts_year_fk",
    }).onDelete("cascade"),
    index("tga_community_hosts_year_idx").on(t.communityId, t.year),
  ],
);

export const tgaCommunitySheets = pgTable(
  "tga_community_sheets",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    worldPremieresGuess: integer("world_premieres_guess"),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.profileId, t.year] })],
);

export const tgaCommunityPicks = pgTable(
  "tga_community_picks",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => tgaCategories.id, { onDelete: "cascade" }),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => tgaNominees.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({
      columns: [t.communityId, t.profileId, t.year, t.categoryId],
    }),
    index("tga_community_picks_category_idx").on(
      t.communityId,
      t.categoryId,
      t.nomineeId,
    ),
  ],
);

export const tgaCommunityScores = pgTable(
  "tga_community_scores",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    year: integer("year")
      .notNull()
      .references(() => tgaYears.year, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    wpDelta: integer("wp_delta"),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.year, t.profileId] }),
    index("tga_community_scores_board_idx").on(
      t.communityId,
      t.year,
      t.points,
      t.wpDelta,
    ),
  ],
);
