import { describe, expect, it } from "vitest";
import { ogImagePath } from "./og-path";

describe("ogImagePath", () => {
  it("builds query strings for each card kind", () => {
    expect(ogImagePath({ kind: "default" })).toBe("/og.png");
    expect(ogImagePath({ kind: "game", slug: "hades-2" })).toBe(
      "/api/og?kind=game&slug=hades-2",
    );
    expect(
      ogImagePath({ kind: "list", username: "alex", slug: "goty-2026" }),
    ).toBe("/api/og?kind=list&username=alex&slug=goty-2026");
    expect(ogImagePath({ kind: "goty", year: 2026 })).toBe(
      "/api/og?kind=goty&year=2026",
    );
  });
});
