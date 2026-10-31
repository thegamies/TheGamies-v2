/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TgaLeaderboard } from "./TgaLeaderboard";

vi.mock("@/lib/next-link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

afterEach(() => {
  cleanup();
});

describe("TgaLeaderboard", () => {
  it("renders a sticky header with Name, Points, and World Premier Off", () => {
    render(
      <TgaLeaderboard
        page={1}
        totalPages={1}
        pageHref={(page) => `?page=${page}`}
        rows={[
          {
            profileId: "p1",
            place: 1,
            displayName: "Seed Member",
            username: "seed-member",
            avatarUrl: null,
            points: 12,
            wpDelta: 0,
          },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Points" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "World Premier Off" }),
    ).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("Seed Member")).toBeTruthy();
  });
});
