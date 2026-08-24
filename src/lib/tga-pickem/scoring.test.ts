import { describe, expect, it } from "vitest";
import {
  compareScoreRows,
  competitionPlace,
  leaderboardPageCount,
  placeLabel,
  pointsAfterWinnerChange,
  tgaNomineeCallLabel,
  tgaNomineeCallMark,
  worldPremieresDelta,
} from "./scoring";

describe("worldPremieresDelta", () => {
  it("uses absolute difference", () => {
    expect(worldPremieresDelta(12, 10)).toBe(2);
    expect(worldPremieresDelta(8, 10)).toBe(2);
    expect(worldPremieresDelta(null, 10)).toBeNull();
  });
});

describe("pointsAfterWinnerChange", () => {
  it("adds and subtracts one point", () => {
    expect(
      pointsAfterWinnerChange({
        currentPoints: 4,
        pickedOldWinner: true,
        pickedNewWinner: false,
      }),
    ).toBe(3);
    expect(
      pointsAfterWinnerChange({
        currentPoints: 4,
        pickedOldWinner: false,
        pickedNewWinner: true,
      }),
    ).toBe(5);
    expect(
      pointsAfterWinnerChange({
        currentPoints: 4,
        pickedOldWinner: true,
        pickedNewWinner: true,
      }),
    ).toBe(4);
  });
});

describe("competitionPlace", () => {
  it("shares a place when points and WP match", () => {
    const field = [
      { points: 8, wpDelta: 1 },
      { points: 5, wpDelta: 0 },
      { points: 5, wpDelta: 0 },
      { points: 4, wpDelta: 2 },
    ];
    expect(competitionPlace(field[0], field)).toBe(1);
    expect(competitionPlace(field[1], field)).toBe(2);
    expect(competitionPlace(field[2], field)).toBe(2);
    expect(competitionPlace(field[3], field)).toBe(4);
  });
});

describe("compareScoreRows", () => {
  it("sorts by points, then closer WP, then profile id", () => {
    const rows = [
      { points: 3, wpDelta: 4, profileId: "b" },
      { points: 5, wpDelta: 9, profileId: "a" },
      { points: 3, wpDelta: 1, profileId: "c" },
    ];
    rows.sort(compareScoreRows);
    expect(rows.map((row) => row.profileId)).toEqual(["a", "c", "b"]);
  });
});

describe("placeLabel", () => {
  it("uses English ordinals", () => {
    expect(placeLabel(1)).toBe("1st");
    expect(placeLabel(2)).toBe("2nd");
    expect(placeLabel(3)).toBe("3rd");
    expect(placeLabel(11)).toBe("11th");
    expect(placeLabel(21)).toBe("21st");
  });
});

describe("leaderboardPageCount", () => {
  it("keeps a page when empty", () => {
    expect(leaderboardPageCount(0)).toBe(1);
    expect(leaderboardPageCount(51)).toBe(2);
  });
});

describe("tgaNomineeCallMark", () => {
  it("stays open until a winner is called", () => {
    expect(
      tgaNomineeCallMark({
        nomineeId: "n1",
        winnerNomineeId: null,
        pickNomineeId: "n1",
      }),
    ).toBe("uncalled");
  });

  it("marks the called winner, hit, and miss", () => {
    expect(
      tgaNomineeCallMark({
        nomineeId: "n1",
        winnerNomineeId: "n1",
        pickNomineeId: "n1",
      }),
    ).toBe("correct");
    expect(
      tgaNomineeCallMark({
        nomineeId: "n1",
        winnerNomineeId: "n1",
        pickNomineeId: "n2",
      }),
    ).toBe("winner");
    expect(
      tgaNomineeCallMark({
        nomineeId: "n2",
        winnerNomineeId: "n1",
        pickNomineeId: "n2",
      }),
    ).toBe("incorrect");
    expect(
      tgaNomineeCallMark({
        nomineeId: "n3",
        winnerNomineeId: "n1",
        pickNomineeId: "n2",
      }),
    ).toBe("other");
  });

  it("labels only called outcomes", () => {
    expect(tgaNomineeCallLabel("correct")).toBe("Correct");
    expect(tgaNomineeCallLabel("incorrect")).toBe("Incorrect");
    expect(tgaNomineeCallLabel("winner")).toBe("Winner");
    expect(tgaNomineeCallLabel("other")).toBeNull();
    expect(tgaNomineeCallLabel("uncalled")).toBeNull();
  });
});
