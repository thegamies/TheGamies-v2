/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YearSelect } from "./YearSelect";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const OPTIONS = [
  { year: 2026, href: "/game-of-the-year/2026" },
  { year: 2025, href: "/game-of-the-year/2025" },
];

function rect(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    top: 0,
    left,
    right: left + width,
    bottom: 32,
    width,
    height: 32,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function stubRects(triggerLeft: number, triggerWidth: number, menuWidth: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.getAttribute("role") === "listbox") {
        return rect(triggerLeft, menuWidth);
      }
      return rect(triggerLeft, triggerWidth);
    },
  );
}

describe("YearSelect", () => {
  it("opens the menu from the start when the trigger sits on the left", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    stubRects(16, 72, 120);

    render(<YearSelect year={2026} options={OPTIONS} alwaysShow label="Standings year" />);
    fireEvent.click(screen.getByRole("button", { name: "Standings year" }));

    const list = screen.getByRole("listbox", { name: "Standings year" });
    expect(list.getAttribute("data-menu-edge")).toBe("start");
    expect(list.className).toContain("left-0");
  });

  it("opens the menu from the end when the trigger sits on the right", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    stubRects(272, 72, 120);

    render(<YearSelect year={2026} options={OPTIONS} alwaysShow label="Standings year" />);
    fireEvent.click(screen.getByRole("button", { name: "Standings year" }));

    const list = screen.getByRole("listbox", { name: "Standings year" });
    expect(list.getAttribute("data-menu-edge")).toBe("end");
    expect(list.className).toContain("right-0");
  });

  it("uses an unbordered All trigger that stays shrink-wrapped", () => {
    render(
      <YearSelect
        options={OPTIONS}
        label="All"
        triggerLabel="All"
      />,
    );
    const trigger = screen.getByRole("button", { name: "All" });
    expect(trigger.textContent).toContain("All");
    expect(trigger.className).not.toContain("border");
    expect(trigger.className).toContain("text-2xl");
    expect(trigger.className).toContain("font-display");
    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "2026" }).getAttribute("href")).toBe(
      "/game-of-the-year/2026",
    );
  });
});
