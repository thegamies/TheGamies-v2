/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TgaBallotComingSoon } from "./TgaBallotComingSoon";

afterEach(() => {
  cleanup();
});

describe("TgaBallotComingSoon", () => {
  it("does not render nominees before picks open", () => {
    render(
      <TgaBallotComingSoon
        year={{
          enabled: true,
          opensAt: new Date("2026-12-01T18:00:00.000Z"),
          showStartsAt: new Date("2026-12-11T01:00:00.000Z"),
        }}
      />,
    );
    expect(screen.getByText("Picks soon.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
