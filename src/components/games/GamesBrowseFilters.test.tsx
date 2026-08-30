/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GamesBrowseFilters } from "./GamesBrowseFilters";

afterEach(() => {
  cleanup();
});

describe("GamesBrowseFilters", () => {
  it("offers All years and the picker-style year list", () => {
    render(
      <GamesBrowseFilters
        q=""
        year={undefined}
        sort="popularity"
        sortDir="desc"
        releaseStatus="all"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(screen.getByRole("button", { name: "All years" })).toBeTruthy();
    const currentYear = String(new Date().getUTCFullYear());
    expect(screen.getByRole("button", { name: currentYear })).toBeTruthy();
  });
});
