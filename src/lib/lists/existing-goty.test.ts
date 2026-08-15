import { describe, expect, it } from "vitest";
import {
  existingGotyEditHref,
  existingGotyPreviewHref,
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
