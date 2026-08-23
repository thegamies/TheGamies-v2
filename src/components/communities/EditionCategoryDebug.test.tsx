/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EditionCategoryDebugPopover,
  EditionCategoryDebugProvider,
} from "./EditionCategoryDebug";

vi.mock("@/lib/communities/edition-reveal-tie-debug", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/communities/edition-reveal-tie-debug")>();
  return {
    ...actual,
    isEditionRevealTieDebugEnabled: () => true,
  };
});

afterEach(() => {
  cleanup();
});

describe("EditionCategoryDebugPopover", () => {
  it("keeps Repeat and Cap inside the Debug popover", () => {
    render(
      <EditionCategoryDebugProvider categoryPodiums={[]}>
        <EditionCategoryDebugPopover />
      </EditionCategoryDebugProvider>,
    );

    expect(screen.queryByRole("dialog", { name: "Category reveal stress test" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Debug" }));
    expect(
      screen.getByRole("dialog", { name: "Category reveal stress test" }),
    ).toBeTruthy();
    expect(screen.getByText("Repeat")).toBeTruthy();
    expect(screen.getByText("Cap")).toBeTruthy();
  });
});
