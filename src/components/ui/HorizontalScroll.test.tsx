/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HorizontalScroll,
  HorizontalScrollGroup,
  isScrollSyncPeer,
  resetScrollSyncGroupsForTests,
  setScrollSyncVisibilityForTests,
} from "./HorizontalScroll";

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
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
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
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
  it("mirrors scrollLeft from the driver strip to peers", () => {
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

  it("batches multiple scroll events into one peer write per frame", () => {
    let frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });

    render(
      <HorizontalScrollGroup groupId="test-batch">
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

    const leftWrites: number[] = [];
    Object.defineProperty(peer!, "scrollLeft", {
      configurable: true,
      get() {
        return (this as { _left?: number })._left ?? 0;
      },
      set(v: number) {
        (this as { _left?: number })._left = v;
        leftWrites.push(v);
      },
    });

    driver!.scrollLeft = 10;
    fireEvent.scroll(driver!);
    driver!.scrollLeft = 20;
    fireEvent.scroll(driver!);
    driver!.scrollLeft = 40;
    fireEvent.scroll(driver!);

    expect(leftWrites).toEqual([]);
    expect(frames).toHaveLength(1);

    frames[0]!(0);
    expect(leftWrites).toEqual([40]);
  });

  it("skips off-screen peers while flinging, then syncs them on settle", () => {
    // Keep rAF immediate (from beforeEach); only fake the settle timeout.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      render(
        <HorizontalScrollGroup groupId="test-visible">
          <HorizontalScroll label="driver">
            <div>D</div>
          </HorizontalScroll>
          <HorizontalScroll label="on-screen">
            <div>V</div>
          </HorizontalScroll>
          <HorizontalScroll label="off-screen">
            <div>H</div>
          </HorizontalScroll>
        </HorizontalScrollGroup>,
      );

      const [driver, visible, hidden] = bodies();
      mockOverflow(driver!, 800, 200);
      mockOverflow(visible!, 800, 200);
      mockOverflow(hidden!, 800, 200);
      setScrollSyncVisibilityForTests("test-visible", hidden!, false);

      driver!.scrollLeft = 90;
      fireEvent.scroll(driver!);

      expect(visible!.scrollLeft).toBe(90);
      expect(hidden!.scrollLeft).toBe(0);

      vi.advanceTimersByTime(200);
      expect(hidden!.scrollLeft).toBe(90);
    } finally {
      vi.useRealTimers();
    }
  });
});
