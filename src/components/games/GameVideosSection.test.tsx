/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameVideosSection } from "./GameVideosSection";

afterEach(() => {
  cleanup();
});

describe("GameVideosSection", () => {
  it("swaps a single embed when another title is chosen", () => {
    render(
      <GameVideosSection
        videos={[
          {
            igdbId: 1,
            name: "Trailer",
            videoId: "aaa",
            posterUrl: null,
          },
          {
            igdbId: 2,
            name: "Gameplay",
            videoId: "bbb",
            posterUrl: null,
          },
        ]}
      />,
    );

    expect(screen.getByTitle("Trailer").getAttribute("src")).toContain("aaa");
    fireEvent.click(screen.getByRole("button", { name: "Gameplay" }));
    expect(screen.getByTitle("Gameplay").getAttribute("src")).toContain("bbb");
    expect(screen.queryByTitle("Trailer")).toBeNull();
  });

  it("renders nothing without videos", () => {
    const { container } = render(<GameVideosSection videos={[]} />);
    expect(container.textContent).toBe("");
  });
});
