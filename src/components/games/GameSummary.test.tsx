/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameSummary } from "./GameSummary";

const summary =
  "A long editorial blurb about the game that should clamp when the paragraph overflows its four-line box.";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GameSummary", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(200);
  });

  it("clamps the summary and expands on Show more", () => {
    render(<GameSummary text={summary} />);

    const paragraph = screen.getByText(summary);
    expect(paragraph.className).toContain("line-clamp-4");

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(paragraph.className).not.toContain("line-clamp-4");
    expect(screen.getByRole("button", { name: "Show less" })).toBeTruthy();
  });

  it("hides the toggle when the summary fits", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(80);
    render(<GameSummary text="A short blurb." />);
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });
});
