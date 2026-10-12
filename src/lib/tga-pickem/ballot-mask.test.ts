import { describe, expect, it } from "vitest";
import {
  decodeBallotMask,
  encodeBallotMask,
  pickCountDeltas,
  type MaskCategory,
} from "./ballot-mask";

const awards: MaskCategory[] = [
  {
    id: "goty",
    slot: 2,
    nominees: [
      { id: "game-a", slot: 1 },
      { id: "game-b", slot: 3 },
    ],
  },
  {
    id: "score",
    slot: 1,
    nominees: [{ id: "song", slot: 2 }],
  },
];

describe("ballot masks", () => {
  it("stores the nominee slot at the award slot", () => {
    const mask = encodeBallotMask(awards, { goty: "game-b", score: "song" });
    expect(Array.from(mask)).toEqual([0, 2, 3]);
    expect(decodeBallotMask(mask, awards)).toEqual({
      goty: "game-b",
      score: "song",
    });
  });

  it("keeps the same bytes when display order changes", () => {
    const picks = { goty: "game-a", score: "song" };
    const reversed = [...awards].reverse();
    expect(Array.from(encodeBallotMask(reversed, picks))).toEqual(
      Array.from(encodeBallotMask(awards, picks)),
    );
    expect(encodeBallotMask(awards, picks)[2]).toBe(1);
  });

  it("reads a postgres hex mask", () => {
    const mask = encodeBallotMask(awards, { score: "song" });
    const hex = `\\x${Array.from(mask)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
    expect(decodeBallotMask(hex, awards)).toEqual({ score: "song" });
  });

  it("skips a retired nominee slot", () => {
    const mask = encodeBallotMask(awards, { goty: "game-b" });
    const without = awards.map((category) => ({
      ...category,
      nominees: category.nominees.filter((nominee) => nominee.id !== "game-b"),
    }));
    expect(decodeBallotMask(mask, without)).toEqual({});
  });

  it("diffs the nominees a save changed", () => {
    expect(
      pickCountDeltas(
        { goty: "game-a" },
        { goty: "game-b", score: "song" },
      ),
    ).toEqual([
      { categoryId: "goty", nomineeId: "game-a", delta: -1 },
      { categoryId: "goty", nomineeId: "game-b", delta: 1 },
      { categoryId: "score", nomineeId: "song", delta: 1 },
    ]);
  });
});
