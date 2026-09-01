/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  completeGoogleProfile: vi.fn(),
}));

import { CompleteProfileForm } from "./CompleteProfileForm";

afterEach(() => {
  cleanup();
});

describe("CompleteProfileForm", () => {
  it("pre-fills Google name and username and lets the user edit them", () => {
    render(
      <CompleteProfileForm
        next="/account"
        suggestedDisplayName="Ada Lovelace"
        suggestedUsername="ada_lovelace"
        googleImageUrl="https://lh3.googleusercontent.com/photo"
      />,
    );
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeTruthy();
    expect(screen.getByDisplayValue("ada_lovelace")).toBeTruthy();
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "https://lh3.googleusercontent.com/photo",
    );
  });
});
