/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TgaSettings } from "./TgaSettings";

afterEach(() => {
  cleanup();
});

describe("TgaSettings", () => {
  it("lists created years and create, not on/off", () => {
    render(
      <TgaSettings
        slug="eric"
        years={[{ year: 2026, status: "locked" }]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Create Video Game Awards Pick/ }),
    ).toHaveAttribute("href", "/communities/eric/create/the-game-awards");
    expect(screen.getByText("Locked")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Turn off/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Run / })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Manage hosts" }),
    ).toHaveAttribute(
      "href",
      "/communities/eric/the-game-awards/2026?view=settings",
    );
  });

  it("shows an empty list", () => {
    render(<TgaSettings slug="eric" years={[]} />);
    expect(screen.getByText("No Pick’em yet.")).toBeTruthy();
  });
});
