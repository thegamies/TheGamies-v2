import { sql } from "drizzle-orm";
import {
  boolean,
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

/** Personal GOTY or custom ranked list. Drafts are private; published share via publicId. */
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
    status: text("status").notNull().default("draft"),
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
