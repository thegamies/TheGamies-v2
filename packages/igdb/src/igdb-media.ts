export const COVER_FIELDS =
  "id, alpha_channel, animated, checksum, game, game_localization, height, image_id, image_type, url, width";

export const ARTWORK_FIELDS =
  "id, alpha_channel, animated, checksum, game, height, image_id, image_type, url, width";

export const SCREENSHOT_FIELDS =
  "id, alpha_channel, animated, checksum, game, height, image_id, url, width";

export const GAME_VIDEO_FIELDS = "id, checksum, game, name, video_id";

export const IMAGE_TYPE_FIELDS =
  "id, checksum, created_at, name, updated_at";

export function igdbUnixToDate(value: number | undefined | null): Date | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Date(value * 1000);
}

export type IgdbCoverRow = {
  id: number;
  alpha_channel?: boolean;
  animated?: boolean;
  checksum?: string;
  game?: number;
  game_localization?: number;
  height?: number;
  image_id?: string;
  image_type?: number;
  url?: string;
  width?: number;
};

export type IgdbArtworkRow = {
  id: number;
  alpha_channel?: boolean;
  animated?: boolean;
  checksum?: string;
  game?: number;
  height?: number;
  image_id?: string;
  image_type?: number;
  url?: string;
  width?: number;
};

export type IgdbScreenshotRow = {
  id: number;
  alpha_channel?: boolean;
  animated?: boolean;
  checksum?: string;
  game?: number;
  height?: number;
  image_id?: string;
  url?: string;
  width?: number;
};

export type IgdbGameVideoRow = {
  id: number;
  checksum?: string;
  game?: number;
  name?: string;
  video_id?: string;
};

export type IgdbImageTypeRow = {
  id: number;
  checksum?: string;
  created_at?: number;
  name?: string;
  updated_at?: number;
};

export function mapCoverRow(row: IgdbCoverRow) {
  return {
    igdbId: row.id,
    imageId: row.image_id ?? null,
    url: row.url ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    alphaChannel: row.alpha_channel ?? null,
    animated: row.animated ?? null,
    checksum: row.checksum ?? null,
    gameIgdbId: row.game ?? null,
    gameLocalizationIgdbId: row.game_localization ?? null,
    imageTypeIgdbId: row.image_type ?? null,
    syncedAt: new Date(),
  };
}

export function mapArtworkRow(row: IgdbArtworkRow) {
  return {
    igdbId: row.id,
    alphaChannel: row.alpha_channel ?? null,
    animated: row.animated ?? null,
    checksum: row.checksum ?? null,
    gameIgdbId: row.game ?? null,
    height: row.height ?? null,
    imageId: row.image_id ?? null,
    imageTypeIgdbId: row.image_type ?? null,
    url: row.url ?? null,
    width: row.width ?? null,
    syncedAt: new Date(),
  };
}

export function mapScreenshotRow(row: IgdbScreenshotRow) {
  return {
    igdbId: row.id,
    alphaChannel: row.alpha_channel ?? null,
    animated: row.animated ?? null,
    checksum: row.checksum ?? null,
    gameIgdbId: row.game ?? null,
    height: row.height ?? null,
    imageId: row.image_id ?? null,
    url: row.url ?? null,
    width: row.width ?? null,
    syncedAt: new Date(),
  };
}

export function mapGameVideoRow(row: IgdbGameVideoRow) {
  return {
    igdbId: row.id,
    checksum: row.checksum ?? null,
    gameIgdbId: row.game ?? null,
    name: row.name ?? null,
    videoId: row.video_id ?? null,
    syncedAt: new Date(),
  };
}

export function mapImageTypeRow(row: IgdbImageTypeRow) {
  return {
    igdbId: row.id,
    name: row.name?.trim() || `Image type ${row.id}`,
    checksum: row.checksum ?? null,
    igdbCreatedAt: igdbUnixToDate(row.created_at ?? null),
    igdbUpdatedAt: igdbUnixToDate(row.updated_at ?? null),
    syncedAt: new Date(),
  };
}
