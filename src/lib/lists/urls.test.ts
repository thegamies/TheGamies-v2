import { describe, expect, it } from "vitest";
import { listSharePath } from "./urls";

describe("listSharePath", () => {
  it("uses username slug for owned lists", () => {
    expect(
      listSharePath({
        publicId: "abc",
        slug: "goty-2026",
        username: "alex",
      }),
    ).toBe("/u/alex/goty-2026");
  });

  it("falls back to publicId for anon lists", () => {
    expect(listSharePath({ publicId: "abc" })).toBe("/l/abc");
    expect(
      listSharePath({ publicId: "abc", slug: "goty-2026" }),
    ).toBe("/l/abc");
  });
});
