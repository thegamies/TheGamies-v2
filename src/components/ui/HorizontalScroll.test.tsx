/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HorizontalScroll,
  HorizontalScrollGroup,
  isScrollSyncPeer,
  resetScrollSyncGroupsForTests,
} from "./HorizontalScroll";

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

beforeEach(() => {
  resetScrollSyncGroupsForTests();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  resetScrollSyncGroupsForTests();
  vi.unstubAllGlobals();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

function mockOverflow(el: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    writable: true,
    value: 0,
  });
}

function bodies() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-hscroll-body]"),
  );
}

describe("HorizontalScrollGroup", () => {
  it("mirrors scrollLeft from the driver strip to peers immediately", () => {
    render(
      <HorizontalScrollGroup groupId="test-sync">
        <HorizontalScroll label="row a">
          <div>A</div>
        </HorizontalScroll>
        <HorizontalScroll label="row b">
          <div>B</div>
        </HorizontalScroll>
        <HorizontalScroll label="row c">
          <div>C</div>
        </HorizontalScroll>
      </HorizontalScrollGroup>,
    );

    const [a, b, c] = bodies();
    expect(a && b && c).toBeTruthy();
    mockOverflow(a!, 800, 200);
    mockOverflow(b!, 800, 200);
    mockOverflow(c!, 800, 200);

    a!.scrollLeft = 120;
    fireEvent.scroll(a!);

    expect(b!.scrollLeft).toBe(120);
    expect(c!.scrollLeft).toBe(120);
  });

  it("does not let peer scroll events rebroadcast back to the driver", () => {
    render(
      <HorizontalScrollGroup groupId="test-no-echo">
        <HorizontalScroll label="driver">
          <div>D</div>
        </HorizontalScroll>
        <HorizontalScroll label="peer">
          <div>P</div>
        </HorizontalScroll>
      </HorizontalScrollGroup>,
    );

    const [driver, peer] = bodies();
    mockOverflow(driver!, 800, 200);
    mockOverflow(peer!, 800, 200);

    driver!.scrollLeft = 80;
    fireEvent.scroll(driver!);
    expect(peer!.scrollLeft).toBe(80);
    expect(isScrollSyncPeer("test-no-echo", peer!)).toBe(true);

    // Simulate a late mobile scroll event from the programmatic write, with a
    // slightly different left (inertia / subpixel). Must not yank the driver.
    peer!.scrollLeft = 95;
    fireEvent.scroll(peer!);
    expect(driver!.scrollLeft).toBe(80);
    expect(isScrollSyncPeer("test-no-echo", peer!)).toBe(true);
  });

  it("stays locked when the driver reverses direction", () => {
    render(
      <HorizontalScrollGroup groupId="test-wiggle">
        <HorizontalScroll label="driver">
          <div>D</div>
        </HorizontalScroll>
        <HorizontalScroll label="peer">
          <div>P</div>
        </HorizontalScroll>
      </HorizontalScrollGroup>,
    );

    const [driver, peer] = bodies();
    mockOverflow(driver!, 800, 200);
    mockOverflow(peer!, 800, 200);

    driver!.scrollLeft = 40;
    fireEvent.scroll(driver!);
    expect(peer!.scrollLeft).toBe(40);

    driver!.scrollLeft = 120;
    fireEvent.scroll(driver!);
    expect(peer!.scrollLeft).toBe(120);

    driver!.scrollLeft = 30;
    fireEvent.scroll(driver!);
    expect(peer!.scrollLeft).toBe(30);
  });

  it("lets another strip take over after the first gesture settles", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      render(
        <HorizontalScrollGroup groupId="test-takeover">
          <HorizontalScroll label="first">
            <div>A</div>
          </HorizontalScroll>
          <HorizontalScroll label="second">
            <div>B</div>
          </HorizontalScroll>
        </HorizontalScrollGroup>,
      );

      const [a, b] = bodies();
      mockOverflow(a!, 800, 200);
      mockOverflow(b!, 800, 200);

      a!.scrollLeft = 50;
      fireEvent.scroll(a!);
      expect(b!.scrollLeft).toBe(50);
      expect(isScrollSyncPeer("test-takeover", b!)).toBe(true);

      vi.advanceTimersByTime(200);
      await Promise.resolve();
      expect(isScrollSyncPeer("test-takeover", b!)).toBe(false);

      b!.scrollLeft = 90;
      fireEvent.scroll(b!);
      expect(a!.scrollLeft).toBe(90);
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates edge fades on the driver without toggling React arrow state", () => {
    render(
      <HorizontalScroll label="solo">
        <div>Wide</div>
      </HorizontalScroll>,
    );

    const body = bodies()[0]!;
    const host = body.parentElement as HTMLElement;
    mockOverflow(body, 800, 200);

    fireEvent.scroll(body);
    expect(host.dataset.canRight).toBe("true");
    expect(host.dataset.canLeft).toBeUndefined();
    expect(screen.queryByLabelText("Scroll solo left")).toBeNull();

    body.scrollLeft = 600;
    fireEvent.scroll(body);
    expect(host.dataset.canLeft).toBe("true");
    expect(host.dataset.canRight).toBeUndefined();
  });

  it("disables horizontal rubber-band overscroll on the viewport", () => {
    render(
      <HorizontalScroll label="solo">
        <div>Wide</div>
      </HorizontalScroll>,
    );

    const body = bodies()[0]!;
    expect(body.className).toContain("overscroll-x-none");
  });
});
