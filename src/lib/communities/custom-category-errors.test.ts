import { describe, expect, it, vi } from "vitest";
import { clientSafeCustomCategoryError } from "./custom-category-errors";

describe("clientSafeCustomCategoryError", () => {
  it("maps unique category name constraints without exposing SQL", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const msg = clientSafeCustomCategoryError(
      new Error(
        'duplicate key value violates unique constraint "community_custom_categories_edition_name_uidx"',
      ),
      "Could not create category.",
    );
    expect(msg).toBe("A community category with that name already exists.");
    expect(msg).not.toMatch(/duplicate key|constraint|uidx/i);
    spy.mockRestore();
  });

  it("maps nested postgres unique errors for entries", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const nested = Object.assign(new Error("Failed query"), {
      cause: {
        code: "23505",
        constraint: "community_custom_category_entries_title_uidx",
        message: "duplicate key value violates unique constraint",
      },
    });
    expect(clientSafeCustomCategoryError(nested, "Could not add entry.")).toBe(
      "An entry with that title already exists in this category.",
    );
    spy.mockRestore();
  });

  it("keeps short product-facing messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      clientSafeCustomCategoryError(
        new Error("Enter a category name."),
        "Could not create category.",
      ),
    ).toBe("Enter a category name.");
    spy.mockRestore();
  });

  it("falls back instead of leaking SQL dumps", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      clientSafeCustomCategoryError(
        new Error(
          'Failed query: insert into "community_custom_categories" values (...)',
        ),
        "Could not create category.",
      ),
    ).toBe("Could not create category.");
    spy.mockRestore();
  });
});
