/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TgaBallotForm } from "./TgaBallotForm";

vi.mock("@/lib/next-link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

const categories = [
  {
    id: "cat-1",
    slot: 1,
    sortOrder: 1,
    label: "Game of the Year",
    description: null,
    kind: "game" as const,
    winnerNomineeId: null,
    nominees: [
      {
        id: "nom-1",
        slot: 1,
        gameId: "g1",
        displayName: "Dispatch",
        slug: "dispatch",
        imageUrl: null,
      },
      {
        id: "nom-2",
        slot: 2,
        gameId: "g2",
        displayName: "Silksong",
        slug: "hollow-knight-silksong",
        imageUrl: null,
      },
    ],
  },
  {
    id: "cat-2",
    slot: 2,
    sortOrder: 2,
    label: "Best Action",
    description: null,
    kind: "game" as const,
    winnerNomineeId: null,
    nominees: [
      {
        id: "nom-3",
        slot: 1,
        gameId: "g3",
        displayName: "Nioh 3",
        slug: "nioh-3",
        imageUrl: null,
      },
    ],
  },
];

describe("TgaBallotForm", () => {
  it("shows pick progress, tiebreaker copy, and a save control while open", () => {
    render(
      <TgaBallotForm
        categories={categories}
        initialPicks={{ "cat-1": "nom-1" }}
        initialGuess={null}
        locked={false}
        onSave={async () => ({ ok: true })}
      />,
    );

    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByText("Tiebreaker needed")).toBeTruthy();
    expect(
      screen.getByText(
        /Tiebreaker — guess how many world premieres there will be/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save picks" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Dispatch/i }));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "7" },
    });

    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByText("Tiebreaker set")).toBeTruthy();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save picks" }),
    ).toBeEnabled();
  });
});
