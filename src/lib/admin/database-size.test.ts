import { describe, expect, it } from "vitest";
import {
  attachIndexes,
  formatBytes,
  sumTableBytes,
  tableDisplayName,
} from "./database-size";

describe("formatBytes", () => {
  it("uses binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
  });
});

describe("attachIndexes", () => {
  it("groups indexes under the matching table and sorts by size", () => {
    const tables = attachIndexes(
      [
        {
          schema: "public",
          name: "games",
          estRows: 10,
          heapBytes: 100,
          indexBytes: 50,
          toastBytes: 0,
          totalBytes: 150,
        },
        {
          schema: "public",
          name: "covers",
          estRows: 2,
          heapBytes: 20,
          indexBytes: 0,
          toastBytes: 0,
          totalBytes: 20,
        },
      ],
      [
        { schema: "public", table: "games", name: "games_pkey", bytes: 10 },
        { schema: "public", table: "games", name: "games_slug_idx", bytes: 40 },
      ],
    );
    expect(tables[0]?.indexes.map((index) => index.name)).toEqual([
      "games_slug_idx",
      "games_pkey",
    ]);
    expect(tables[1]?.indexes).toEqual([]);
    expect(sumTableBytes(tables)).toBe(170);
    expect(tableDisplayName("public", "games")).toBe("games");
    expect(tableDisplayName("neon_auth", "users")).toBe("neon_auth.users");
  });
});
