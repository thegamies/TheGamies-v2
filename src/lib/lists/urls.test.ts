import { describe, expect, it } from "vitest";
import { listSharePath, listShareViewHref, parseListShareView, withListShareView } from "./urls";

describe("listSharePath", () => {
  it("uses username slug for owned lists", () => {
    expect(
      listSharePath({
        publicId: "abc",
        slug: "goty-2026",
        username: "alex",
      }),
    ).toBe("/u/alex/goty-2026");
  });

  it("falls back to publicId for anon lists", () => {
    expect(listSharePath({ publicId: "abc" })).toBe("/l/abc");
    expect(
      listSharePath({ publicId: "abc", slug: "goty-2026" }),
    ).toBe("/l/abc");
  });
});

describe("parseListShareView", () => {
  it("defaults to goty", () => {
    expect(parseListShareView(undefined)).toBe("goty");
    expect(parseListShareView("goty")).toBe("goty");
    expect(parseListShareView("nope")).toBe("goty");
    expect(parseListShareView("categories")).toBe("categories");
  });
});

describe("listShareViewHref", () => {
  it("omits the default GOTY view", () => {
    expect(listShareViewHref("/u/alex/goty-2026")).toBe("/u/alex/goty-2026");
    expect(listShareViewHref("/u/alex/goty-2026", { view: "goty" })).toBe(
      "/u/alex/goty-2026",
    );
  });

  it("sets categories and preserves saved", () => {
    expect(
      listShareViewHref("/u/alex/goty-2026", { view: "categories" }),
    ).toBe("/u/alex/goty-2026?view=categories");
    expect(
      listShareViewHref("/u/alex/goty-2026", {
        view: "categories",
        saved: true,
      }),
    ).toBe("/u/alex/goty-2026?view=categories&saved=1");
  });
});

describe("withListShareView", () => {
  it("adds categories onto an edit href", () => {
    expect(withListShareView("/create/goty?id=abc", "categories")).toBe(
      "/create/goty?id=abc&view=categories",
    );
  });

  it("drops view when opening GOTY", () => {
    expect(
      withListShareView("/create/goty?id=abc&view=categories", "goty"),
    ).toBe("/create/goty?id=abc");
  });
});
