export type ParsedIgdbCover = {
  id: number;
  image_id?: string;
  url?: string;
  width?: number;
  height?: number;
};

export type ParsedIgdbPlatform = {
  id: number;
  name?: string;
  slug?: string;
  abbreviation?: string;
};

export type ParsedIgdbNamed = {
  id: number;
  name?: string;
  slug?: string;
};

export type ParsedIgdbGameType = {
  id: number;
  type?: string;
};

export type ParsedIgdbInvolvedCompany = {
  id: number;
  company?: number;
  game?: number;
  developer?: boolean;
  publisher?: boolean;
  porting?: boolean;
  supporting?: boolean;
};

export type ParsedIgdbGameTimeToBeat = {
  id: number;
  game_id?: number;
  hastily?: number;
  normally?: number;
  completely?: number;
  count?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNumericId(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Webhook payload missing numeric ${label}`);
  }
  return value;
}

function parseOptionalFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Webhook game payload rating field must be a finite number");
  }
  return value;
}

function parseNumericIdArray(value: unknown, label: string): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Webhook game payload ${label} must be an array`);
  }
  return value.map((item, index) =>
    requireNumericId(item, `${label}[${index}]`),
  );
}

function parseOptionalBoolean(
  value: unknown,
  label: string,
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Webhook involved company payload ${label} must be a boolean`);
  }
  return value;
}

export function parseDeleteIgdbIdFromPayload(payload: unknown): number {
  if (!isRecord(payload)) {
    throw new Error("Webhook delete payload must be an object");
  }
  return requireNumericId(payload.id, "id");
}

export function assertIgdbGame(payload: unknown): {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  cover?: number;
  platforms?: number[];
  keywords?: number[];
  themes?: number[];
  genres?: number[];
  involved_companies?: number[];
  version_parent?: number;
  parent_game?: number;
  game_type?: number;
  total_rating?: number;
  total_rating_count?: number;
  follows?: number;
  hypes?: number;
} {
  if (!isRecord(payload)) {
    throw new Error("Webhook game payload must be an object");
  }
  const game: ReturnType<typeof assertIgdbGame> = {
    id: requireNumericId(payload.id, "id"),
  };

  if (payload.name !== undefined) game.name = String(payload.name);
  if (payload.slug !== undefined) {
    game.slug = payload.slug == null ? undefined : String(payload.slug);
  }
  if (payload.summary !== undefined) {
    game.summary =
      payload.summary == null ? undefined : String(payload.summary);
  }
  if (payload.first_release_date !== undefined) {
    game.first_release_date = requireNumericId(
      payload.first_release_date,
      "first_release_date",
    );
  }
  if (payload.cover !== undefined) {
    game.cover = requireNumericId(payload.cover, "cover");
  }
  if (payload.platforms !== undefined) {
    game.platforms = parseNumericIdArray(payload.platforms, "platforms");
  }
  if (payload.keywords !== undefined) {
    game.keywords = parseNumericIdArray(payload.keywords, "keywords");
  }
  if (payload.themes !== undefined) {
    game.themes = parseNumericIdArray(payload.themes, "themes");
  }
  if (payload.genres !== undefined) {
    game.genres = parseNumericIdArray(payload.genres, "genres");
  }
  if (payload.involved_companies !== undefined) {
    game.involved_companies = parseNumericIdArray(
      payload.involved_companies,
      "involved_companies",
    );
  }
  if (payload.version_parent !== undefined) {
    game.version_parent =
      payload.version_parent == null
        ? undefined
        : requireNumericId(payload.version_parent, "version_parent");
  }
  if (payload.parent_game !== undefined) {
    game.parent_game =
      payload.parent_game == null
        ? undefined
        : requireNumericId(payload.parent_game, "parent_game");
  }
  if (payload.game_type !== undefined) {
    game.game_type =
      payload.game_type == null
        ? undefined
        : requireNumericId(payload.game_type, "game_type");
  }
  if (payload.total_rating !== undefined) {
    game.total_rating = parseOptionalFiniteNumber(payload.total_rating);
  }
  if (payload.total_rating_count !== undefined) {
    game.total_rating_count = parseOptionalFiniteNumber(
      payload.total_rating_count,
    );
  }
  if (payload.follows !== undefined) {
    game.follows = parseOptionalFiniteNumber(payload.follows);
  }
  if (payload.hypes !== undefined) {
    game.hypes = parseOptionalFiniteNumber(payload.hypes);
  }

  return game;
}

export function assertIgdbCover(payload: unknown): ParsedIgdbCover {
  if (!isRecord(payload)) {
    throw new Error("Webhook cover payload must be an object");
  }
  const cover: ParsedIgdbCover = { id: requireNumericId(payload.id, "id") };
  if (payload.image_id !== undefined) {
    cover.image_id =
      payload.image_id == null ? undefined : String(payload.image_id);
  }
  if (payload.url !== undefined) {
    cover.url = payload.url == null ? undefined : String(payload.url);
  }
  if (payload.width !== undefined) {
    cover.width = requireNumericId(payload.width, "width");
  }
  if (payload.height !== undefined) {
    cover.height = requireNumericId(payload.height, "height");
  }
  return cover;
}

export function assertIgdbPlatform(payload: unknown): ParsedIgdbPlatform {
  if (!isRecord(payload)) {
    throw new Error("Webhook platform payload must be an object");
  }
  const platform: ParsedIgdbPlatform = {
    id: requireNumericId(payload.id, "id"),
  };
  if (payload.name !== undefined) {
    platform.name = payload.name == null ? undefined : String(payload.name);
  }
  if (payload.slug !== undefined) {
    platform.slug = payload.slug == null ? undefined : String(payload.slug);
  }
  if (payload.abbreviation !== undefined) {
    platform.abbreviation =
      payload.abbreviation == null
        ? undefined
        : String(payload.abbreviation);
  }
  return platform;
}

function assertNamed(
  payload: unknown,
  label: string,
): ParsedIgdbNamed {
  if (!isRecord(payload)) {
    throw new Error(`Webhook ${label} payload must be an object`);
  }
  const row: ParsedIgdbNamed = { id: requireNumericId(payload.id, "id") };
  if (payload.name !== undefined) {
    row.name = payload.name == null ? undefined : String(payload.name);
  }
  if (payload.slug !== undefined) {
    row.slug = payload.slug == null ? undefined : String(payload.slug);
  }
  return row;
}

export function assertIgdbKeyword(payload: unknown): ParsedIgdbNamed {
  return assertNamed(payload, "keyword");
}

export function assertIgdbTheme(payload: unknown): ParsedIgdbNamed {
  return assertNamed(payload, "theme");
}

export function assertIgdbGenre(payload: unknown): ParsedIgdbNamed {
  return assertNamed(payload, "genre");
}

export function assertIgdbCompany(payload: unknown): ParsedIgdbNamed {
  return assertNamed(payload, "company");
}

export function assertIgdbGameType(payload: unknown): ParsedIgdbGameType {
  if (!isRecord(payload)) {
    throw new Error("Webhook game type payload must be an object");
  }
  const gameType: ParsedIgdbGameType = {
    id: requireNumericId(payload.id, "id"),
  };
  if (payload.type !== undefined) {
    gameType.type = payload.type == null ? undefined : String(payload.type);
  }
  return gameType;
}

export function assertIgdbInvolvedCompany(
  payload: unknown,
): ParsedIgdbInvolvedCompany {
  if (!isRecord(payload)) {
    throw new Error("Webhook involved company payload must be an object");
  }
  const row: ParsedIgdbInvolvedCompany = {
    id: requireNumericId(payload.id, "id"),
  };
  if (payload.company !== undefined) {
    row.company =
      payload.company == null
        ? undefined
        : requireNumericId(payload.company, "company");
  }
  if (payload.game !== undefined) {
    row.game =
      payload.game == null
        ? undefined
        : requireNumericId(payload.game, "game");
  }
  if (payload.developer !== undefined) {
    row.developer = parseOptionalBoolean(payload.developer, "developer");
  }
  if (payload.publisher !== undefined) {
    row.publisher = parseOptionalBoolean(payload.publisher, "publisher");
  }
  if (payload.porting !== undefined) {
    row.porting = parseOptionalBoolean(payload.porting, "porting");
  }
  if (payload.supporting !== undefined) {
    row.supporting = parseOptionalBoolean(payload.supporting, "supporting");
  }
  return row;
}

export function assertIgdbGameTimeToBeat(
  payload: unknown,
): ParsedIgdbGameTimeToBeat {
  if (!isRecord(payload)) {
    throw new Error("Webhook game time-to-beat payload must be an object");
  }
  const row: ParsedIgdbGameTimeToBeat = {
    id: requireNumericId(payload.id, "id"),
  };
  if (payload.game_id !== undefined) {
    row.game_id =
      payload.game_id == null
        ? undefined
        : requireNumericId(payload.game_id, "game_id");
  }
  if (payload.hastily !== undefined) {
    row.hastily =
      payload.hastily == null
        ? undefined
        : requireNumericId(payload.hastily, "hastily");
  }
  if (payload.normally !== undefined) {
    row.normally =
      payload.normally == null
        ? undefined
        : requireNumericId(payload.normally, "normally");
  }
  if (payload.completely !== undefined) {
    row.completely =
      payload.completely == null
        ? undefined
        : requireNumericId(payload.completely, "completely");
  }
  if (payload.count !== undefined) {
    row.count =
      payload.count == null
        ? undefined
        : requireNumericId(payload.count, "count");
  }
  return row;
}
