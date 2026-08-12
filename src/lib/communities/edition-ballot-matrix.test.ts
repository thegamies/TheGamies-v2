import { describe, expect, it } from "vitest";
import {
  assembleBallotMatrixRows,
  matrixHasAnyGames,
} from "./edition-ballot-matrix";

describe("assembleBallotMatrixRows", () => {
  const voiceColumns = [
    { profileId: "v1", displayName: "Ada", username: "ada" },
    { profileId: "v2", displayName: "Bea", username: "bea" },
  ];

  it("aligns top-10 lists by shared rank rows", () => {
    const rows = assembleBallotMatrixRows({
      top: 3,
      community: [
        {
          place: 1,
          gameId: "c1",
          slug: "comm-one",
          title: "Comm One",
          coverUrl: null,
        },
        {
          place: 2,
          gameId: "c2",
          slug: "comm-two",
          title: "Comm Two",
          coverUrl: null,
        },
      ],
      voices: [
        {
          place: 1,
          gameId: "vo1",
          slug: "voice-agg",
          title: "Voice Agg",
          coverUrl: null,
        },
      ],
      voiceColumns,
      voterRanks: [
        {
          profileId: "me",
          rank: 1,
          gameId: "y1",
          slug: "you-one",
          title: "You One",
          coverUrl: null,
        },
        {
          profileId: "v1",
          rank: 1,
          gameId: "a1",
          slug: "ada-one",
          title: "Ada One",
          coverUrl: null,
        },
        {
          profileId: "v2",
          rank: 2,
          gameId: "b2",
          slug: "bea-two",
          title: "Bea Two",
          coverUrl: null,
        },
      ],
      viewerProfileId: "me",
      includeYou: true,
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      rank: 1,
      you: { gameId: "y1", title: "You One" },
      community: { gameId: "c1", title: "Comm One" },
      voices: { gameId: "vo1", title: "Voice Agg" },
      voiceGames: {
        v1: { gameId: "a1", title: "Ada One" },
        v2: null,
      },
    });
    expect(rows[1]).toMatchObject({
      rank: 2,
      you: null,
      community: { gameId: "c2" },
      voices: null,
      voiceGames: {
        v1: null,
        v2: { gameId: "b2", title: "Bea Two" },
      },
    });
    expect(rows[2]?.community).toBeNull();
    expect(matrixHasAnyGames(rows)).toBe(true);
  });

  it("omits You column data when includeYou is false", () => {
    const rows = assembleBallotMatrixRows({
      top: 2,
      community: [
        {
          place: 1,
          gameId: "c1",
          slug: "c",
          title: "C",
          coverUrl: null,
        },
      ],
      voices: [],
      voiceColumns: [],
      voterRanks: [
        {
          profileId: "me",
          rank: 1,
          gameId: "y1",
          slug: "y",
          title: "Y",
          coverUrl: null,
        },
      ],
      viewerProfileId: "me",
      includeYou: false,
    });

    expect(rows[0]?.you).toBeNull();
    expect(rows[0]?.community?.gameId).toBe("c1");
  });
});
