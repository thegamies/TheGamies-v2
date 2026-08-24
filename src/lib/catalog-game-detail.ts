import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import {
  artworks,
  gameArtworks,
  gameScreenshots,
  gameVideoLinks,
  gameVideos,
  imageTypes,
  screenshots,
  type Db,
} from "@thegamies/db";

export const GAME_DETAIL_ARTWORK_CAP = 12;
export const GAME_DETAIL_SCREENSHOT_CAP = 12;
export const GAME_DETAIL_VIDEO_CAP = 8;

export function gameArtworksForDetailQuery(db: Db, gameId: string) {
  return db
    .select({
      igdbId: artworks.igdbId,
      imageId: artworks.imageId,
      imageTypeName: imageTypes.name,
      width: artworks.width,
      height: artworks.height,
    })
    .from(gameArtworks)
    .innerJoin(artworks, eq(artworks.igdbId, gameArtworks.artworkIgdbId))
    .leftJoin(imageTypes, eq(imageTypes.igdbId, artworks.imageTypeIgdbId))
    .where(
      and(
        eq(gameArtworks.gameId, gameId),
        or(
          isNull(imageTypes.name),
          sql`lower(${imageTypes.name}) <> 'logo'`,
        ),
      ),
    )
    .orderBy(asc(artworks.igdbId))
    .limit(GAME_DETAIL_ARTWORK_CAP);
}

export function gameScreenshotsForDetailQuery(db: Db, gameId: string) {
  return db
    .select({
      igdbId: screenshots.igdbId,
      imageId: screenshots.imageId,
      width: screenshots.width,
      height: screenshots.height,
    })
    .from(gameScreenshots)
    .innerJoin(
      screenshots,
      eq(screenshots.igdbId, gameScreenshots.screenshotIgdbId),
    )
    .where(eq(gameScreenshots.gameId, gameId))
    .orderBy(asc(screenshots.igdbId))
    .limit(GAME_DETAIL_SCREENSHOT_CAP);
}

export function gameVideosForDetailQuery(db: Db, gameId: string) {
  return db
    .select({
      igdbId: gameVideos.igdbId,
      name: gameVideos.name,
      videoId: gameVideos.videoId,
    })
    .from(gameVideoLinks)
    .innerJoin(gameVideos, eq(gameVideos.igdbId, gameVideoLinks.videoIgdbId))
    .where(eq(gameVideoLinks.gameId, gameId))
    .orderBy(asc(gameVideos.igdbId))
    .limit(GAME_DETAIL_VIDEO_CAP);
}
