const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_BASE = "https://api.igdb.com/v4";
const MIN_REQUEST_GAP_MS = 280;

export type IgdbGame = {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  updated_at?: number;
  cover?: number;
  platforms?: number[];
  genres?: number[];
  themes?: number[];
  keywords?: number[];
  involved_companies?: number[];
  artworks?: number[];
  screenshots?: number[];
  videos?: number[];
  game_type?: number;
  parent_game?: number;
  version_parent?: number;
  total_rating?: number;
  total_rating_count?: number;
  follows?: number;
  hypes?: number;
};

export type AdultFilters = {
  eroticThemeId: number | null;
  erogeKeywordId: number | null;
};

let cachedToken: { token: string; expiresAt: number } | null = null;
let lastRequestAt = 0;
let cachedAdultFilters: AdultFilters | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireCreds() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

export function hasIgdbCreds(): boolean {
  return Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET);
}

export async function getIgdbToken(): Promise<string> {
  const { clientId, clientSecret } = requireCreds();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const url =
    `${TOKEN_URL}?client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(clientSecret)}` +
    `&grant_type=client_credentials`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function igdbQuery<T>(endpoint: string, body: string): Promise<T> {
  const { clientId } = requireCreds();
  const token = await getIgdbToken();

  for (let attempt = 0; ; attempt++) {
    const gap = Date.now() - lastRequestAt;
    if (gap < MIN_REQUEST_GAP_MS) {
      await sleep(MIN_REQUEST_GAP_MS - gap);
    }
    lastRequestAt = Date.now();

    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body,
    });

    const retryable =
      res.status === 429 || (res.status >= 500 && res.status <= 504);
    if (retryable && attempt < 5) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`IGDB ${endpoint} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }
}

export function computePopularity(game: IgdbGame): number {
  const ratingCount = game.total_rating_count ?? 0;
  const follows = game.follows ?? 0;
  const hypes = game.hypes ?? 0;
  return Math.round(ratingCount * 4 + follows * 2 + hypes * 3);
}

export function isAdultGame(game: IgdbGame, filters: AdultFilters): boolean {
  const themeHit =
    filters.eroticThemeId != null &&
    Array.isArray(game.themes) &&
    game.themes.includes(filters.eroticThemeId);
  const keywordHit =
    filters.erogeKeywordId != null &&
    Array.isArray(game.keywords) &&
    game.keywords.includes(filters.erogeKeywordId);
  return Boolean(themeHit || keywordHit);
}

export async function resolveAdultFilters(): Promise<AdultFilters> {
  if (cachedAdultFilters) return cachedAdultFilters;

  const themes = await igdbQuery<{ id: number; name?: string }[]>(
    "themes",
    'fields id, name; where slug = "erotic" | name = "Erotic"; limit 5;',
  );
  const eroticTheme =
    themes.find((t) => t.name?.toLowerCase() === "erotic") ?? themes[0] ?? null;

  let erogeKeywordId: number | null = null;
  const bySlug = await igdbQuery<{ id: number }[]>(
    "keywords",
    'fields id, name; where slug = "eroge"; limit 1;',
  );
  if (bySlug[0]) {
    erogeKeywordId = bySlug[0].id;
  } else {
    const byName = await igdbQuery<{ id: number }[]>(
      "keywords",
      'fields id, name; where name = "eroge"; limit 1;',
    );
    erogeKeywordId = byName[0]?.id ?? null;
  }

  cachedAdultFilters = {
    eroticThemeId: eroticTheme?.id ?? null,
    erogeKeywordId,
  };
  return cachedAdultFilters;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type MappedGame = {
  igdbId: number;
  slug: string;
  title: string;
  summary: string | null;
  year: number | null;
  firstReleaseDate: Date | null;
  coverIgdbId: number | null;
  gameTypeIgdbId: number | null;
  parentGameIgdbId: number | null;
  versionParentIgdbId: number | null;
  isAdult: boolean;
  rating: number | null;
  ratingCount: number | null;
  follows: number | null;
  hypes: number | null;
  popularity: number;
  platformIgdbIds: number[];
  genreIgdbIds: number[];
  themeIgdbIds: number[];
  keywordIgdbIds: number[];
  involvedCompanyIgdbIds: number[];
  artworkIgdbIds: number[];
  screenshotIgdbIds: number[];
  videoIgdbIds: number[];
};

export function mapIgdbGame(
  game: IgdbGame,
  filters: AdultFilters,
): MappedGame | null {
  const title = game.name?.trim();
  if (!title) return null;
  const slug = game.slug?.trim() || `${slugify(title)}-${game.id}`;
  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000)
    : null;
  return {
    igdbId: game.id,
    slug,
    title,
    summary: game.summary?.trim() || null,
    year: releaseDate ? releaseDate.getUTCFullYear() : null,
    firstReleaseDate: releaseDate,
    coverIgdbId: typeof game.cover === "number" ? game.cover : null,
    gameTypeIgdbId: game.game_type ?? null,
    parentGameIgdbId: game.parent_game ?? null,
    versionParentIgdbId: game.version_parent ?? null,
    isAdult: isAdultGame(game, filters),
    rating: game.total_rating != null ? Math.round(game.total_rating) : null,
    ratingCount: game.total_rating_count ?? null,
    follows: game.follows ?? null,
    hypes: game.hypes ?? null,
    popularity: computePopularity(game),
    platformIgdbIds: game.platforms ?? [],
    genreIgdbIds: game.genres ?? [],
    themeIgdbIds: game.themes ?? [],
    keywordIgdbIds: game.keywords ?? [],
    involvedCompanyIgdbIds: game.involved_companies ?? [],
    artworkIgdbIds: game.artworks ?? [],
    screenshotIgdbIds: game.screenshots ?? [],
    videoIgdbIds: game.videos ?? [],
  };
}

export const GAME_FIELDS =
  "fields id, name, slug, summary, first_release_date, updated_at, cover, " +
  "platforms, genres, themes, keywords, involved_companies, game_type, " +
  "parent_game, version_parent, total_rating, total_rating_count, follows, hypes, " +
  "artworks, screenshots, videos;";

export function yearUnixRange(year: number): { start: number; end: number } {
  const start = Math.floor(Date.UTC(year, 0, 1) / 1000);
  const end = Math.floor(Date.UTC(year + 1, 0, 1) / 1000);
  return { start, end };
}

export function buildEntityPageQuery(options: {
  fields: string;
  afterId: number;
  limit: number;
  sinceUnix?: number;
  extraWhere?: string;
}): string {
  const trimmed = options.fields.trim().replace(/;+$/, "");
  const fields = /^fields\s/i.test(trimmed) ? trimmed : `fields ${trimmed}`;
  let where = `id > ${options.afterId}`;
  if (options.sinceUnix != null) {
    where += ` & updated_at >= ${options.sinceUnix}`;
  }
  if (options.extraWhere) {
    where += ` & ${options.extraWhere}`;
  }
  return `${fields}; where ${where}; sort id asc; limit ${options.limit};`;
}

export async function fetchEntityPage<T extends { id: number }>(options: {
  endpoint: string;
  fields: string;
  afterId: number;
  limit?: number;
  sinceUnix?: number;
  extraWhere?: string;
}): Promise<T[]> {
  const limit = options.limit ?? 500;
  const body = buildEntityPageQuery({
    fields: options.fields,
    afterId: options.afterId,
    limit,
    sinceUnix: options.sinceUnix,
    extraWhere: options.extraWhere,
  });
  return igdbQuery<T[]>(options.endpoint, body);
}

export async function fetchGamesPage(options: {
  afterId: number;
  limit?: number;
  year?: number;
}): Promise<IgdbGame[]> {
  const limit = options.limit ?? 500;
  let extraWhere: string | undefined;
  if (options.year != null) {
    const { start, end } = yearUnixRange(options.year);
    extraWhere = `first_release_date >= ${start} & first_release_date < ${end}`;
  }
  return fetchEntityPage<IgdbGame>({
    endpoint: "games",
    fields: GAME_FIELDS,
    afterId: options.afterId,
    limit,
    extraWhere,
  });
}

export async function fetchUpdatedGamesPage(
  sinceUnix: number,
  afterId: number,
  limit = 500,
): Promise<IgdbGame[]> {
  return fetchEntityPage<IgdbGame>({
    endpoint: "games",
    fields: GAME_FIELDS,
    afterId,
    limit,
    sinceUnix,
  });
}

export async function fetchByIds<T extends { id: number }>(
  endpoint: string,
  ids: number[],
  fields: string,
  limit = 500,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += limit) {
    const chunk = ids.slice(i, i + limit);
    const body = `fields ${fields}; where id = (${chunk.join(",")}); limit ${limit};`;
    const page = await igdbQuery<T[]>(endpoint, body);
    out.push(...page);
  }
  return out;
}

export function coverUrlFromImageId(imageId?: string | null): string | null {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
    : null;
}

export function wideImageUrlFromImageId(imageId?: string | null): string | null {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_720p/${imageId}.jpg`
    : null;
}

export function youtubePosterUrl(videoId?: string | null): string | null {
  const id = videoId?.trim();
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export type IgdbImageSize =
  | "thumb"
  | "cover_small"
  | "cover_big"
  | "cover_big_2x"
  | "720p"
  | "1080p";

const SIZE_TOKEN: Record<IgdbImageSize, string> = {
  thumb: "t_thumb",
  cover_small: "t_cover_small",
  cover_big: "t_cover_big",
  cover_big_2x: "t_cover_big_2x",
  "720p": "t_720p",
  "1080p": "t_1080p",
};

export function igdbImage(
  url: string | null | undefined,
  size: IgdbImageSize,
): string | null {
  if (!url) return null;
  return url.replace(/\/t_[^/]+\//, `/${SIZE_TOKEN[size]}/`);
}
