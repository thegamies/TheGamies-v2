/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuidelinesPage from "./page";

describe("GuidelinesPage", () => {
  it("states community rules and links to Terms", () => {
    render(<GuidelinesPage />);
    expect(
      screen.getByRole("heading", { name: "Community Guidelines" }),
    ).toBeTruthy();
    const termsLinks = screen.getAllByRole("link", { name: "Terms of Service" });
    expect(termsLinks.length).toBeGreaterThan(0);
    expect(termsLinks[0]?.getAttribute("href")).toBe("/terms");
    const contactLinks = screen.getAllByRole("link", { name: "Contact" });
    expect(contactLinks.some((link) => link.getAttribute("href") === "/contact")).toBe(
      true,
    );
  });
});
