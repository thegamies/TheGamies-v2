/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankingsInfoControl } from "./RankingsInfoControl";

describe("RankingsInfoControl", () => {
  it("explains rankings without stating the publish floor", () => {
    render(<RankingsInfoControl />);
    fireEvent.click(screen.getByRole("button", { name: "About rankings" }));
    expect(screen.getByRole("dialog", { name: "About rankings" })).toBeTruthy();
    expect(screen.getByText(/enough lists have been saved/i)).toBeTruthy();
    expect(screen.queryByText(/\b5\b/)).toBeNull();
    expect(screen.queryByText(/minimum/i)).toBeNull();
  });
});
