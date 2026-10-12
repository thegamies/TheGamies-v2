import { describe, expect, it } from "vitest";
import { reorderTgaCategories } from "./service";

describe("reorderTgaCategories", () => {
  it("changes display order and leaves slots alone", async () => {
    const sets: unknown[] = [];
    const db = {
      update: () => ({
        set: (value: unknown) => {
          sets.push(value);
          return { where: () => Promise.resolve() };
        },
      }),
    };
    await expect(
      reorderTgaCategories(2026, ["b", "a"], db as never),
    ).resolves.toEqual({ ok: true });
    expect(sets).toEqual([{ sortOrder: 1 }, { sortOrder: 2 }]);
  });
});
