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

    // Grouped strips do not broadcast from scroll events (pointer/wheel drive).
    expect(b!.scrollLeft).toBe(0);
    expect(c!.scrollLeft).toBe(0);
  });

  it("locksteps every strip on the same pointer move (no peer lag)", () => {
    render(
      <HorizontalScrollGroup groupId="test-lockstep">
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
    mockOverflow(a!, 800, 200);
    mockOverflow(b!, 800, 200);
    mockOverflow(c!, 800, 200);
    a!.setPointerCapture = () => {};
    a!.releasePointerCapture = () => {};

    fireEvent.pointerDown(a!, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 200,
      clientY: 40,
    });
    fireEvent.pointerMove(a!, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 140,
      clientY: 42,
    });

    expect(a!.scrollLeft).toBe(60);
    expect(b!.scrollLeft).toBe(60);
    expect(c!.scrollLeft).toBe(60);

    fireEvent.pointerMove(a!, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 170,
      clientY: 42,
    });
    expect(a!.scrollLeft).toBe(30);
    expect(b!.scrollLeft).toBe(30);
    expect(c!.scrollLeft).toBe(30);
  });

  it("does not start a horizontal pan when the gesture is vertical", () => {
    render(
      <HorizontalScrollGroup groupId="test-vertical">
        <HorizontalScroll label="row a">
          <div>A</div>
        </HorizontalScroll>
        <HorizontalScroll label="row b">
          <div>B</div>
        </HorizontalScroll>
      </HorizontalScrollGroup>,
    );

    const [a, b] = bodies();
    mockOverflow(a!, 800, 200);
    mockOverflow(b!, 800, 200);

    fireEvent.pointerDown(a!, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 40,
    });
    fireEvent.pointerMove(a!, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 102,
      clientY: 80,
    });

    expect(a!.scrollLeft).toBe(0);
    expect(b!.scrollLeft).toBe(0);
  });

  it("uses overflow-x-hidden and touch-pan-y when grouped", () => {
    render(
      <HorizontalScrollGroup groupId="test-chrome">
        <HorizontalScroll label="row a">
          <div>A</div>
        </HorizontalScroll>
      </HorizontalScrollGroup>,
    );

    const body = bodies()[0]!;
    expect(body.dataset.hscrollGrouped).toBe("true");
    expect(body.className).toContain("overflow-x-hidden");
    expect(body.className).toContain("touch-pan-y");
    expect(body.className).toContain("overscroll-x-none");
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
    driver!.setPointerCapture = () => {};
    driver!.releasePointerCapture = () => {};

    fireEvent.pointerDown(driver!, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 200,
      clientY: 10,
    });
    fireEvent.pointerMove(driver!, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 120,
      clientY: 10,
    });
    expect(peer!.scrollLeft).toBe(80);
    expect(isScrollSyncPeer("test-no-echo", peer!)).toBe(true);

    peer!.scrollLeft = 95;
    fireEvent.scroll(peer!);
    expect(driver!.scrollLeft).toBe(80);
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

  it("keeps native overflow-x on ungrouped strips", () => {
    render(
      <HorizontalScroll label="solo">
        <div>Wide</div>
      </HorizontalScroll>,
    );

    const body = bodies()[0]!;
    expect(body.className).toContain("overflow-x-auto");
    expect(body.dataset.hscrollGrouped).toBeUndefined();
  });
});
