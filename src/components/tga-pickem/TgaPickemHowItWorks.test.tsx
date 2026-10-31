/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TgaPickemHowItWorks } from "./TgaPickemHowItWorks";

afterEach(() => {
  cleanup();
});

describe("TgaPickemHowItWorks", () => {
  it("keeps the rules blurb short", () => {
    render(<TgaPickemHowItWorks />);
    expect(
      screen.getByText(/Call each award\. One point per correct pick\./i),
    ).toBeTruthy();
    expect(screen.getByText(/World Premieres is the tiebreaker/i)).toBeTruthy();
  });
});
