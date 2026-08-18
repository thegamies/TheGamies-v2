/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileSocialLinks } from "./ProfileSocialLinks";

describe("ProfileSocialLinks", () => {
  it("renders allowed profile socials and skips empty keys", () => {
    render(
      <ProfileSocialLinks
        value={{
          x: "https://x.com/thegamies",
          website: "https://thegamies.gg",
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "X" }).getAttribute("href"),
    ).toBe("https://x.com/thegamies");
    expect(
      screen.getByRole("link", { name: "Website" }).getAttribute("href"),
    ).toBe("https://thegamies.gg");
    expect(screen.queryByRole("link", { name: "Discord" })).toBeNull();
  });
});
