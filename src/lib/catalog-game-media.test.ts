import { describe, expect, it } from "vitest";
import {
  groupArtworksByImageType,
  imageChaptersFromMedia,
} from "./catalog-game-media";

describe("groupArtworksByImageType", () => {
  it("hides logos and groups the rest, with untyped last", () => {
    const groups = groupArtworksByImageType([
      { imageTypeName: "Logo", id: 1 },
      { imageTypeName: "Concept Art", id: 2 },
      { imageTypeName: null, id: 3 },
      { imageTypeName: "Concept Art", id: 4 },
    ]);
    expect(groups).toEqual([
      {
        label: "Concept Art",
        items: [
          { imageTypeName: "Concept Art", id: 2 },
          { imageTypeName: "Concept Art", id: 4 },
        ],
      },
      { label: "Artwork", items: [{ imageTypeName: null, id: 3 }] },
    ]);
  });
});

describe("imageChaptersFromMedia", () => {
  it("uses artwork types only", () => {
    expect(
      imageChaptersFromMedia([
        {
          igdbId: 1,
          imageUrl: "a",
          imageTypeName: "Concept Art",
          width: 1920,
          height: 1080,
        },
        {
          igdbId: 2,
          imageUrl: "b",
          imageTypeName: "Engine Screenshot",
          width: 1080,
          height: 1920,
        },
      ]).map((chapter) => chapter.label),
    ).toEqual(["Concept Art", "Engine Screenshot"]);
  });
});
