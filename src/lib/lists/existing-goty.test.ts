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
  it("keeps the existing preview query", () => {
    expect(existingGotyPreviewHref("abc123")).toBe(
      "/create/goty?id=abc123&existing=1",
    );
  });
});
