/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameScreenshotsSection } from "./GameScreenshotsSection";

afterEach(() => {
  cleanup();
});

describe("GameScreenshotsSection", () => {
  it("renders nothing without screenshots", () => {
    const { container } = render(<GameScreenshotsSection screenshots={[]} />);
    expect(container.textContent).toBe("");
  });

  it("renders its own heading", () => {
    render(
      <GameScreenshotsSection
        screenshots={[
          {
            igdbId: 21,
            imageUrl: "https://images.igdb.com/igdb/image/upload/t_720p/s.jpg",
            width: 1920,
            height: 1080,
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Screenshots" })).toBeTruthy();
  });
});
