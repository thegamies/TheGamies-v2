import { describe, expect, it } from "vitest";
import { publicPageMetadata } from "./site";

describe("publicPageMetadata", () => {
  it("indexes and follows by default", () => {
    expect(publicPageMetadata({ title: "About", path: "/about" }).robots).toEqual(
      { index: true, follow: true },
    );
  });

  it("noindexes catalog pagination without following the dump", () => {
    expect(
      publicPageMetadata({
        title: "Games",
        path: "/games",
        index: false,
      }).robots,
    ).toEqual({ index: false, follow: false });
  });

  it("noindexes thin game pages but still follows links", () => {
    expect(
      publicPageMetadata({
        title: "A title",
        path: "/games/a-title",
        index: false,
        follow: true,
      }).robots,
    ).toEqual({ index: false, follow: true });
  });
});
