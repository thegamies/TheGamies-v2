/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteStatus } from "./RouteStatus";

vi.mock("next/link", () => ({
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

describe("RouteStatus", () => {
  it("renders an inset loading status without a page shell", () => {
    const { container } = render(
      <RouteStatus status="loading" inset />,
    );
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector(".route-spinner")).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("calls onRetry from the error action", () => {
    const onRetry = vi.fn();
    render(<RouteStatus status="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: "Couldn’t load this page" }),
    ).toBeTruthy();
  });

  it("links not-found back to the communities index", () => {
    render(<RouteStatus status="not-found" />);
    expect(
      screen.getByRole("heading", { name: "Community not found" }),
    ).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to communities" });
    expect(back.getAttribute("href")).toBe("/communities");
  });
});
