import { beforeEach, describe, expect, it, vi } from "vitest";

const { inArraySpy } = vi.hoisted(() => ({ inArraySpy: vi.fn() }));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    inArray: (column: unknown, values: unknown) => {
      inArraySpy(values);
      return actual.inArray(column as never, values as never);
    },
  };
});

import { LIST_MAX_ITEMS } from "./schema";
import { hydrateGamesByIgdbIds } from "./service";

function fakeDb() {
  const where = vi.fn().mockResolvedValue([]);
  const db = {
    select: () => ({ from: () => ({ leftJoin: () => ({ where }) }) }),
  };
  return { db: db as never, where };
}

beforeEach(() => {
  inArraySpy.mockReset();
});

describe("hydrateGamesByIgdbIds", () => {
  it("skips the database for empty or invalid input", async () => {
    const { db, where } = fakeDb();
    await expect(hydrateGamesByIgdbIds([], db)).resolves.toEqual([]);
    await expect(
      hydrateGamesByIgdbIds([0, -1, 1.5, Number.NaN, Infinity], db),
    ).resolves.toEqual([]);
    expect(where).not.toHaveBeenCalled();
  });

  it("caps a huge request at the list maximum after de-duplicating", async () => {
    const { db } = fakeDb();
    const ids = [
      ...Array.from({ length: 50 }, () => 7),
      ...Array.from({ length: 10_000 }, (_, i) => i + 1),
    ];
    await hydrateGamesByIgdbIds(ids, db);
    const queried = inArraySpy.mock.calls[0]?.[0] as number[];
    expect(queried).toHaveLength(LIST_MAX_ITEMS);
    expect(new Set(queried).size).toBe(LIST_MAX_ITEMS);
    expect(queried[0]).toBe(7);
  });
});
