import { describe, expect, it } from "vitest";
import { publicPageMetadata } from "./site";

describe("publicPageMetadata", () => {
  it("indexes and follows by default", () => {
    expect(publicPageMetadata({ title: "About", path: "/about" }).robots).toEqual(
      { index: true, follow: true },
    );
  });

  it("noindexes without following when index is false", () => {
    expect(
      publicPageMetadata({
        title: "Private",
        path: "/private",
        index: false,
      }).robots,
    ).toEqual({ index: false, follow: false });
  });

  it("noindexes but follows when follow is kept true", () => {
    expect(
      publicPageMetadata({
        title: "A title",
        path: "/somewhere",
        index: false,
        follow: true,
      }).robots,
    ).toEqual({ index: false, follow: true });
  });
});
