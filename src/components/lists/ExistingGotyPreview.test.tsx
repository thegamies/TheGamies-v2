/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExistingGotyPreview } from "./ExistingGotyPreview";

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

describe("ExistingGotyPreview", () => {
  it("puts Edit on the title row", () => {
    render(
      <ExistingGotyPreview
        year={2026}
        publicId="abc123"
        title="2026 Game of the Year"
        items={[]}
      />,
    );
    const heading = screen.getByText("2026 Game of the Year");
    const edit = screen.getByRole("link", { name: "Edit" });
    expect(edit).toHaveAttribute("href", "/create/goty?id=abc123");
    expect(heading.parentElement).toBe(edit.parentElement);
    expect(screen.queryByRole("button", { name: "Edit list" })).toBeNull();
  });

  it("keeps Categories on Edit when opened from that view", () => {
    render(
      <ExistingGotyPreview
        year={2026}
        publicId="abc123"
        title="2026 Game of the Year"
        items={[]}
        editorView="categories"
      />,
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/create/goty?id=abc123&view=categories",
    );
  });
});
