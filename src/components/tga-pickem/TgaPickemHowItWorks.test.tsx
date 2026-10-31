/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  TGA_PICKEM_HOW_IT_WORKS,
  TgaPickemHowItWorks,
} from "./TgaPickemHowItWorks";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("TgaPickemHowItWorks", () => {
  it("opens the rules in a dialog from a How it works button", () => {
    render(<TgaPickemHowItWorks />);
    expect(
      screen.queryByText(/Predict the winner of every award/i),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "How it works" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(TGA_PICKEM_HOW_IT_WORKS)).toBeTruthy();
    expect(TGA_PICKEM_HOW_IT_WORKS.includes("—")).toBe(false);
  });
});
