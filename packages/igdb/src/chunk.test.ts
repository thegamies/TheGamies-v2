import { describe, expect, it, vi } from "vitest";
import { INSERT_CHUNK, insertChunked } from "./chunk";

describe("insertChunked", () => {
  it("no-ops on empty input", async () => {
    const insert = vi.fn();
    await insertChunked([], insert);
    expect(insert).not.toHaveBeenCalled();
  });

  it("splits values into INSERT_CHUNK batches", async () => {
    const insert = vi.fn(async () => undefined);
    const values = Array.from({ length: INSERT_CHUNK + 3 }, (_, i) => ({
      id: i,
    }));
    await insertChunked(values, insert);
    expect(insert).toHaveBeenCalledTimes(2);
    const [first, second] = insert.mock.calls as unknown as [
      [{ id: number }[]],
      [{ id: number }[]],
    ];
    expect(first[0]).toHaveLength(INSERT_CHUNK);
    expect(second[0]).toHaveLength(3);
  });
});
