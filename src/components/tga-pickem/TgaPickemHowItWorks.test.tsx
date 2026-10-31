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
      screen.getByText(/Predict the winner of every award/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Earn 1 point for each correct pick/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/World Premiere prediction decides the winner/i),
    ).toBeTruthy();
  });
});
