/** @vitest-environment jsdom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ScrollableNav } from "./ScrollableNav";

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
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

describe("ScrollableNav", () => {
  it("uses a single-line horizontal scroll row", () => {
    const { container } = render(
      <ScrollableNav aria-label="Fixture tabs">
        <a href="/a">Reveal</a>
        <a href="/b">Results</a>
      </ScrollableNav>,
    );

    const row = container.querySelector(".overflow-x-auto");
    expect(row?.className).toContain("flex-nowrap");
    expect(row?.className).not.toContain("flex-wrap");
  });

  it("shows a right edge fade when tabs overflow", () => {
    const { container } = render(
      <ScrollableNav aria-label="Overflow tabs">
        <a href="/a">Reveal</a>
        <a href="/b">Full standings</a>
        <a href="/c">Categories</a>
      </ScrollableNav>,
    );

    const row = container.querySelector(".overflow-x-auto") as HTMLDivElement;
    mockOverflow(row, 480, 120);
    fireEvent.scroll(row);

    expect(container.querySelector(".bg-gradient-to-l")).toBeTruthy();
    expect(container.querySelector(".bg-gradient-to-r")).toBeNull();
  });

  it("hides edge fades when all tabs fit", () => {
    const { container } = render(
      <ScrollableNav aria-label="Fit tabs">
        <a href="/a">Lists</a>
        <a href="/b">Communities</a>
      </ScrollableNav>,
    );

    const row = container.querySelector(".overflow-x-auto") as HTMLDivElement;
    mockOverflow(row, 120, 120);
    fireEvent.scroll(row);

    expect(container.querySelector(".bg-gradient-to-l")).toBeNull();
    expect(container.querySelector(".bg-gradient-to-r")).toBeNull();
  });
});
