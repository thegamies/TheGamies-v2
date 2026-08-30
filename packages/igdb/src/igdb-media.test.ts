import { describe, expect, it } from "vitest";
import {
  ARTWORK_FIELDS,
  COVER_FIELDS,
  GAME_VIDEO_FIELDS,
  IMAGE_TYPE_FIELDS,
  SCREENSHOT_FIELDS,
  igdbUnixToDate,
  mapImageTypeRow,
} from "./igdb-media";

describe("igdb-media", () => {
  it("maps image type unix timestamps", () => {
    expect(igdbUnixToDate(1_700_000_000)?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(
      mapImageTypeRow({
        id: 4,
        name: "Cover",
        created_at: 1_700_000_000,
        updated_at: 1_700_000_000,
      }),
    ).toMatchObject({
      igdbId: 4,
      name: "Cover",
    });
  });

  it("does not request deprecated artwork_type", () => {
    expect(ARTWORK_FIELDS).not.toContain("artwork_type");
    expect(COVER_FIELDS).toContain("image_type");
    expect(SCREENSHOT_FIELDS).not.toContain("image_type");
    expect(GAME_VIDEO_FIELDS).toContain("video_id");
    expect(IMAGE_TYPE_FIELDS).toContain("name");
  });
});
