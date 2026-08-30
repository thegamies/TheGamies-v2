import { describe, expect, it } from "vitest";
import {
  existingGotyEditHref,
  existingGotyPreviewHref,
  gotyCreatorCta,
  gotyCreatorCtaForView,
} from "./existing-goty";

describe("existingGotyEditHref", () => {
  it("opens the editor without the existing preview flag", () => {
    expect(existingGotyEditHref("abc123")).toBe("/create/goty?id=abc123");
  });

  it("encodes the public id", () => {
    expect(existingGotyEditHref("a/b")).toBe("/create/goty?id=a%2Fb");
  });
});

describe("existingGotyPreviewHref", () => {
  it("stays on the year picker page for that year", () => {
    expect(existingGotyPreviewHref(2026)).toBe("/create/goty?year=2026");
  });
});

describe("gotyCreatorCta", () => {
  it("sends new lists to the year picker", () => {
    expect(gotyCreatorCta(2026, null)).toEqual({
      listLabel: "Create list",
      listHref: "/create/goty?year=2026",
      categoriesLabel: "Make picks",
      categoriesHref: "/create/goty?year=2026&view=categories",
    });
  });

  it("sends owned lists into the editor", () => {
    expect(gotyCreatorCta(2026, "abc123")).toEqual({
      listLabel: "My list",
      listHref: "/create/goty?id=abc123",
      categoriesLabel: "My picks",
      categoriesHref: "/create/goty?id=abc123&view=categories",
    });
  });
});

describe("gotyCreatorCtaForView", () => {
  const create = gotyCreatorCta(2026, null);

  it("uses the list CTA on the GOTY board", () => {
    expect(gotyCreatorCtaForView(create, "goty")).toEqual({
      label: "Create list",
      href: "/create/goty?year=2026",
    });
  });

  it("uses the categories CTA on category boards", () => {
    expect(gotyCreatorCtaForView(create, "categories")).toEqual({
      label: "Make picks",
      href: "/create/goty?year=2026&view=categories",
    });
    expect(gotyCreatorCtaForView(create, "category").label).toBe(
      "Make picks",
    );
  });
});
