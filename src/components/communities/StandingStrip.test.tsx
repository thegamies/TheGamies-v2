/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { StandingStrip } from "@/components/communities/StandingStrip";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe("StandingStrip", () => {
  it("keeps every tied cover as its own card", () => {
    const rows = [
      {
        rank: 1,
        gameId: "a",
        slug: "alpha",
        title: "Alpha",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg",
        votes: 3,
      },
      {
        rank: 1,
        gameId: "b",
        slug: "bravo",
        title: "Bravo",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/b.jpg",
        votes: 3,
      },
      {
        rank: 2,
        gameId: "c",
        slug: "charlie",
        title: "Charlie",
        coverUrl: null,
        votes: 1,
      },
    ];

    render(
      <StandingStrip label="Best Story ranked">
        <ul className={standingStripListClass}>
          {rows.map((row) => (
            <li
              key={row.gameId}
              className={standingStripColClass(row.rank === 1)}
            >
              <StandingGameCard
                place={row.rank}
                placeSize="lg"
                slug={row.slug}
                title={row.title}
                coverUrl={row.coverUrl}
                points={row.votes}
                scoreUnit="votes"
                pinCover
              />
            </li>
          ))}
        </ul>
      </StandingStrip>,
    );

    expect(screen.getByLabelText("Best Story ranked")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Alpha/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Bravo/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Charlie/ })).toBeTruthy();
  });

  it("drags an overflowing strip with the mouse and still allows a click", () => {
    render(
      <StandingStrip label="Best Story ranked">
        <a href="/games/alpha">Alpha</a>
      </StandingStrip>,
    );
    const scroller = screen
      .getByLabelText("Best Story ranked")
      .querySelector("[data-drag-scroll]") as HTMLElement;
    Object.defineProperty(scroller, "scrollWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 200,
    });
    scroller.setPointerCapture = () => {};
    scroller.releasePointerCapture = () => {};

    fireEvent.pointerDown(scroller, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
    });
    fireEvent.pointerMove(scroller, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 96,
    });
    expect(scroller.scrollLeft).toBe(0);

    fireEvent.pointerMove(scroller, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 40,
    });
    expect(scroller.scrollLeft).toBe(60);
    expect(scroller.dataset.dragging).toBe("true");

    fireEvent.pointerUp(scroller, { pointerId: 1, pointerType: "mouse" });
    expect(scroller.dataset.dragging).toBeUndefined();

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    scroller.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);

    fireEvent.pointerDown(scroller, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 100,
    });
    fireEvent.pointerMove(scroller, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 20,
    });
    expect(scroller.scrollLeft).toBe(60);
  });
});
