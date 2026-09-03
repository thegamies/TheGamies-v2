/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TgaTurnoutList } from "./TgaTurnoutList";

afterEach(() => {
  cleanup();
});

describe("TgaTurnoutList", () => {
  it("lists names without opening sheets", () => {
    render(
      <TgaTurnoutList
        rows={[
          {
            profileId: "1",
            displayName: "Eric",
            username: "eric",
            avatarUrl: null,
          },
        ]}
        total={1}
        page={1}
        totalPages={1}
        pageHref={() => "/the-game-awards/2026?view=standings"}
      />,
    );
    expect(screen.getByText("Eric")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Eric" })).toBeNull();
    expect(screen.queryByText(/point/)).toBeNull();
  });
});
