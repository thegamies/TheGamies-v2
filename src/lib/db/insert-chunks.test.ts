import { describe, expect, it, vi } from "vitest";
import { insertInChunks } from "./insert-chunks";

describe("insertInChunks", () => {
  it("writes every row across chunk boundaries", async () => {
    const seen: number[][] = [];
    await insertInChunks(
      [1, 2, 3, 4, 5],
      async (chunk) => {
        seen.push([...chunk]);
      },
      2,
    );
    expect(seen).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("no-ops on an empty list", async () => {
    const write = vi.fn();
    await insertInChunks([], write, 10);
    expect(write).not.toHaveBeenCalled();
  });
});
