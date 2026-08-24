import { createDb } from "@thegamies/db";
import { describe, expect, it } from "vitest";
import {
  GAME_DETAIL_ARTWORK_CAP,
  GAME_DETAIL_SCREENSHOT_CAP,
  GAME_DETAIL_VIDEO_CAP,
  gameArtworksForDetailQuery,
  gameScreenshotsForDetailQuery,
  gameVideosForDetailQuery,
} from "./catalog-game-detail";

const GAME_ID = "11111111-1111-4111-8111-111111111111";

/** Compile SQL without hitting Neon. */
function compile(query: { toSQL: () => { sql: string; params: unknown[] } }) {
  return query.toSQL();
}

describe("game detail media queries", () => {
  const db = createDb("postgresql://user:pass@127.0.0.1/thegamies");

  it("joins artworks to image types, hides logos, and caps the page", () => {
    const { sql, params } = compile(gameArtworksForDetailQuery(db, GAME_ID));
    expect(sql).toContain("game_artworks");
    expect(sql).toContain("artworks");
    expect(sql).toContain("width");
    expect(sql).toContain("image_types");
    expect(sql.toLowerCase()).toContain("logo");
    expect(sql).toMatch(/limit\s+\$?\d+/i);
    expect(params).toContain(GAME_DETAIL_ARTWORK_CAP);
    expect(GAME_DETAIL_ARTWORK_CAP).toBe(12);
  });

  it("joins screenshots and caps the page", () => {
    const { sql, params } = compile(gameScreenshotsForDetailQuery(db, GAME_ID));
    expect(sql).toContain("game_screenshots");
    expect(sql).toContain("screenshots");
    expect(params).toContain(GAME_DETAIL_SCREENSHOT_CAP);
    expect(GAME_DETAIL_SCREENSHOT_CAP).toBe(12);
  });

  it("joins videos and caps the page", () => {
    const { sql, params } = compile(gameVideosForDetailQuery(db, GAME_ID));
    expect(sql).toContain("game_video_links");
    expect(sql).toContain("game_videos");
    expect(params).toContain(GAME_DETAIL_VIDEO_CAP);
    expect(GAME_DETAIL_VIDEO_CAP).toBe(8);
  });
});
