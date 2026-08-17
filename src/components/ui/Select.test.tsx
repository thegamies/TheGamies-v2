/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { Select } from "./Select";

afterEach(() => {
  cleanup();
});

const OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "name", label: "Name" },
] as const;

function Harness() {
  const [value, setValue] = useState("popularity");
  return (
    <Select
      name="sort"
      value={value}
      options={OPTIONS}
      aria-label="Sort"
      onChange={setValue}
    />
  );
}

describe("Select", () => {
  it("opens a listbox and updates the trigger from the chosen option", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Sort" });
    expect(trigger.textContent).toContain("Popularity");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(trigger.textContent).toContain("Name");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("omits the hidden input when the value is empty", () => {
    function EmptyHarness() {
      return (
        <form>
          <Select
            name="year"
            value=""
            options={[
              { value: "", label: "All years" },
              { value: "2026", label: "2026" },
            ]}
            aria-label="Year"
            onChange={() => {}}
          />
        </form>
      );
    }
    const { container } = render(<EmptyHarness />);
    expect(container.querySelector('input[name="year"]')).toBeNull();
  });
});
