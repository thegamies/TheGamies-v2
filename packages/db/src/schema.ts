import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
