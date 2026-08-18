/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteListControl } from "./DeleteListControl";

vi.mock("@/app/create/actions", () => ({
  deleteOwnedListAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("DeleteListControl", () => {
  it("asks to confirm before deleting a GOTY list", () => {
    render(
      <DeleteListControl
        publicId="abc"
        listType="goty"
        title="2026 Game of the Year"
        returnPath="/create/goty?id=abc"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    expect(screen.getByRole("dialog", { name: "Delete this list?" })).toBeTruthy();
    expect(screen.getByText(/leave the Game of the Year board/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});
