/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { ListFormatControl } from "./ListFormatControl";

afterEach(() => {
  cleanup();
});

function Harness() {
  const [value, setValue] = useState<"poster" | "list" | "grid">("grid");
  return <ListFormatControl labeled value={value} onChange={setValue} />;
}

describe("ListFormatControl", () => {
  it("uses the editor Format group and switches segments", () => {
    render(<Harness />);
    expect(screen.getByText("Format")).toBeTruthy();
    const grid = screen.getByRole("button", { name: "Grid" });
    expect(grid.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
