/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompactTieStack } from "./CompactTieStack";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

const games = [
  { gameId: "1", slug: "first-game", title: "First Game", coverUrl: null },
  { gameId: "2", slug: "second-game", title: "Second Game", coverUrl: null },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CompactTieStack", () => {
  it("points the title at the visible game after rotate", () => {
    vi.useFakeTimers();
    render(<CompactTieStack games={games} />);

    expect(
      screen.getByRole("link", { name: "First Game" }).getAttribute("href"),
    ).toBe("/games/first-game");

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    expect(screen.queryByRole("link", { name: "First Game" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Second Game" }).getAttribute("href"),
    ).toBe("/games/second-game");
  });
});
