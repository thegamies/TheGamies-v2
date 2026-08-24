/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameImagesSection } from "./GameImagesSection";

const still = "https://images.igdb.com/igdb/image/upload/t_720p/a.jpg";

afterEach(() => {
  cleanup();
});

describe("GameImagesSection", () => {
  it("renders nothing without artworks", () => {
    const { container } = render(<GameImagesSection artworks={[]} />);
    expect(container.textContent).toBe("");
  });

  it("omits logos and skips type tabs for a single kind", () => {
    render(
      <GameImagesSection
        artworks={[
          { igdbId: 1, imageUrl: still, imageTypeName: "Logo", width: 800, height: 800 },
          {
            igdbId: 2,
            imageUrl: still,
            imageTypeName: "Concept Art",
            width: 1920,
            height: 800,
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Images" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Concept Art" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Logo" })).toBeNull();
  });

  it("swaps the strip when another type is chosen", () => {
    render(
      <GameImagesSection
        artworks={[
          {
            igdbId: 2,
            imageUrl: `${still}?c`,
            imageTypeName: "Concept Art",
            width: 1920,
            height: 800,
          },
          {
            igdbId: 3,
            imageUrl: `${still}?e`,
            imageTypeName: "Engine Screenshot",
            width: 1080,
            height: 1920,
          },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Concept Art 1" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Engine Screenshot" }));
    expect(screen.getByRole("img", { name: "Engine Screenshot 1" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Concept Art 1" })).toBeNull();
  });
});
