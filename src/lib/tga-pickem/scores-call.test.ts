import { describe, expect, it, vi } from "vitest";
import { callTgaWinner } from "./scores";

function sqlText(query: unknown): string {
  if (query && typeof query === "object" && "queryChunks" in query) {
    return (query as { queryChunks: unknown[] }).queryChunks
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (chunk && typeof chunk === "object" && "value" in chunk) {
          const value = (chunk as { value: unknown }).value;
          if (typeof value === "string") return value;
          if (Array.isArray(value)) {
            return value.filter((part) => typeof part === "string").join("");
          }
        }
        return "";
      })
      .join("");
  }
  return String(query);
}

function fakeDb(opts: { yearExists: boolean }) {
  const queries: string[] = [];
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: () => ({
        where: () =>
          Promise.resolve(
            opts.yearExists
              ? [{ year: 2026, worldPremieresOfficial: null }]
              : [],
          ),
      }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    });
  const db = {
    select,
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }),
    execute: async (query: unknown) => {
      queries.push(sqlText(query));
      return { rows: [] };
    },
  };
  return { db, queries };
}

describe("callTgaWinner", () => {
  it("updates points for one nominee and does not insert score rows", async () => {
    const { db, queries } = fakeDb({ yearExists: true });
    await expect(
      callTgaWinner(2026, "category-1", "nominee-1", db as never),
    ).resolves.toEqual({ ok: true });
    const sql = queries.join("\n").toLowerCase();
    expect(sql).toContain("update tga_community_scores");
    expect(sql).toContain("update tga_site_scores");
    expect(sql).not.toContain("insert into tga_site_scores");
    expect(sql).not.toContain("insert into tga_community_scores");
  });

  it("does not write scores when the year is missing", async () => {
    const { db, queries } = fakeDb({ yearExists: false });
    await expect(
      callTgaWinner(2026, "category-1", "nominee-1", db as never),
    ).resolves.toEqual({ error: "Year not found." });
    expect(queries).toEqual([]);
  });
});
