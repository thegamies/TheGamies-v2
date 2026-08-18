/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("links to info pages, site socials, and IGDB", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "About" }).getAttribute("href")).toBe(
      "/about",
    );
    expect(
      screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
    ).toBe("/contact");
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe(
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
    ).toBe("/privacy");
    expect(
      screen.getByRole("link", { name: "Discord" }).getAttribute("href"),
    ).toBe("https://discord.gg/r9Gvj4Fua");
    expect(screen.getByRole("link", { name: "IGDB" }).getAttribute("href")).toBe(
      "https://www.igdb.com/",
    );
  });
});
