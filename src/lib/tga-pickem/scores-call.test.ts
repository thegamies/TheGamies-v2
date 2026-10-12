import { describe, expect, it, vi } from "vitest";
import { callTgaWinner, listSiteLeaderboard } from "./scores";

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
  it("recounts masks into existing score rows", async () => {
    const { db, queries } = fakeDb({ yearExists: true });
    await expect(
      callTgaWinner(2026, "category-1", "nominee-1", db as never),
    ).resolves.toEqual({ ok: true });
    const sql = queries.join("\n").toLowerCase();
    expect(sql).toContain("update tga_community_scores");
    expect(sql).toContain("update tga_site_scores");
    expect(sql).toContain("ballot_mask");
    expect(sql).toContain("get_byte");
    expect(sql).toContain("place");
    expect(sql).toContain("drop index if exists tga_site_scores_board_idx");
    expect(sql).toContain("create index tga_site_scores_board_idx");
    expect(sql).toContain("drop index if exists tga_community_scores_board_idx");
    expect(sql).not.toContain("tga_site_picks");
    expect(sql).not.toContain("tga_community_picks");
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

describe("listSiteLeaderboard", () => {
  it("reads stored place after a winner call has written one", async () => {
    const queries: string[] = [];
    const db = {
      execute: async (query: unknown) => {
        const text = sqlText(query);
        queries.push(text);
        if (text.includes("filter")) return { rows: [{ placed: 4, total: 4 }] };
        return { rows: [] };
      },
    };
    await listSiteLeaderboard(2026, 1, db as never);
    const page = queries.at(-1)?.toLowerCase() ?? "";
    expect(page).toContain("order by sc.place");
    expect(page).not.toContain("rank()");
  });

  it("ranks from points before any place is stored", async () => {
    const queries: string[] = [];
    const db = {
      execute: async (query: unknown) => {
        const text = sqlText(query);
        queries.push(text);
        if (text.includes("filter")) return { rows: [{ placed: 0, total: 4 }] };
        return { rows: [] };
      },
    };
    await listSiteLeaderboard(2026, 1, db as never);
    const page = queries.at(-1)?.toLowerCase() ?? "";
    expect(page).toContain("rank()");
  });
});
