import { describe, expect, it } from "vitest";
import {
  assembleBallotMatrixRows,
  assembleCategoryComparisonRows,
  categoryComparisonHasGames,
  matrixHasAnyGames,
  slotByCompetitionPoints,
  slotByDensePoints,
  slotByOrdinalSpan,
} from "./edition-ballot-matrix";

describe("slotByCompetitionPoints", () => {
  it("puts equal-points games in the same slot and skips the next place", () => {
    const slots = slotByCompetitionPoints(
      [
        {
          place: 1,
          points: 100,
          gameId: "a",
          slug: "a",
          title: "A",
          coverUrl: null,
        },
        {
          place: 2,
          points: 100,
          gameId: "b",
          slug: "b",
          title: "B",
          coverUrl: null,
        },
        {
          place: 3,
          points: 50,
          gameId: "c",
          slug: "c",
          title: "C",
          coverUrl: null,
        },
      ],
      5,
    );

    expect(slots[0]?.map((g) => g.gameId)).toEqual(["a", "b"]);
    expect(slots[1]).toEqual([]);
    expect(slots[2]?.map((g) => g.gameId)).toEqual(["c"]);
  });
});

describe("slotByDensePoints", () => {
  it("puts equal-points games in the same slot and uses the next number", () => {
    const slots = slotByDensePoints(
      [
        {
          place: 1,
          points: 100,
          gameId: "a",
          slug: "a",
          title: "A",
          coverUrl: null,
        },
        {
          place: 2,
          points: 100,
          gameId: "b",
          slug: "b",
          title: "B",
          coverUrl: null,
        },
        {
          place: 3,
          points: 50,
          gameId: "c",
          slug: "c",
          title: "C",
          coverUrl: null,
        },
      ],
      5,
    );

    expect(slots[0]?.map((g) => g.gameId)).toEqual(["a", "b"]);
    expect(slots[1]?.map((g) => g.gameId)).toEqual(["c"]);
    expect(slots[2]).toEqual([]);
  });
});

describe("slotByOrdinalSpan", () => {
  it("repeats a tie group across every ordinal slot it occupies", () => {
    const slots = slotByOrdinalSpan(
      [
        {
          place: 1,
          points: 100,
          gameId: "a",
          slug: "a",
          title: "A",
          coverUrl: null,
        },
        {
          place: 2,
          points: 100,
          gameId: "b",
          slug: "b",
          title: "B",
          coverUrl: null,
        },
        {
          place: 3,
          points: 50,
          gameId: "c",
          slug: "c",
          title: "C",
          coverUrl: null,
        },
      ],
      5,
    );

    expect(slots[0]?.map((g) => g.gameId)).toEqual(["a", "b"]);
    expect(slots[1]?.map((g) => g.gameId)).toEqual(["a", "b"]);
    expect(slots[2]?.map((g) => g.gameId)).toEqual(["c"]);
  });
});

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
          points: 20,
          gameId: "c1",
          slug: "comm-one",
          title: "Comm One",
          coverUrl: null,
        },
        {
          place: 2,
          points: 10,
          gameId: "c2",
          slug: "comm-two",
          title: "Comm Two",
          coverUrl: null,
        },
      ],
      voices: [
        {
          place: 1,
          points: 15,
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
      community: [{ gameId: "c1", title: "Comm One" }],
      voices: [{ gameId: "vo1", title: "Voice Agg" }],
      voiceGames: {
        v1: { gameId: "a1", title: "Ada One" },
        v2: null,
      },
    });
    expect(rows[1]).toMatchObject({
      rank: 2,
      you: null,
      community: [{ gameId: "c2" }],
      voices: [],
      voiceGames: {
        v1: null,
        v2: { gameId: "b2", title: "Bea Two" },
      },
    });
    expect(rows[2]?.community).toEqual([]);
    expect(matrixHasAnyGames(rows)).toBe(true);
  });

  it("keeps a Former member host column and their ballot ranks", () => {
    const rows = assembleBallotMatrixRows({
      top: 2,
      community: [
        {
          place: 1,
          points: 10,
          gameId: "c1",
          slug: "comm-one",
          title: "Comm One",
          coverUrl: null,
        },
      ],
      voices: [
        {
          place: 1,
          points: 10,
          gameId: "h1",
          slug: "host-one",
          title: "Host One",
          coverUrl: null,
        },
      ],
      voiceColumns: [
        {
          profileId: "gone",
          displayName: "Former member",
          username: "former_abc",
        },
      ],
      voterRanks: [
        {
          profileId: "gone",
          rank: 1,
          gameId: "h1",
          slug: "host-one",
          title: "Host One",
          coverUrl: null,
        },
      ],
      viewerProfileId: null,
      includeYou: false,
    });

    expect(rows[0]?.voiceGames.gone).toMatchObject({
      gameId: "h1",
      title: "Host One",
    });
  });

  it("stacks Community ties in one competition slot", () => {
    const rows = assembleBallotMatrixRows({
      top: 3,
      community: [
        {
          place: 1,
          points: 40,
          gameId: "t1",
          slug: "tie-one",
          title: "Tie One",
          coverUrl: null,
        },
        {
          place: 2,
          points: 40,
          gameId: "t2",
          slug: "tie-two",
          title: "Tie Two",
          coverUrl: null,
        },
        {
          place: 3,
          points: 10,
          gameId: "solo",
          slug: "solo",
          title: "Solo",
          coverUrl: null,
        },
      ],
      voices: [],
      voiceColumns: [],
      voterRanks: [],
      viewerProfileId: null,
      includeYou: false,
    });

    expect(rows[0]?.community.map((g) => g.gameId)).toEqual(["t1", "t2"]);
    expect(rows[0]?.community[0]?.points).toBe(40);
    expect(rows[1]?.community).toEqual([]);
    expect(rows[2]?.community.map((g) => g.gameId)).toEqual(["solo"]);
    expect(rows[2]?.community[0]?.points).toBe(10);
  });

  it("stacks Community ties in one dense slot without skipping", () => {
    const rows = assembleBallotMatrixRows({
      top: 3,
      tieMode: "dense",
      community: [
        {
          place: 1,
          points: 40,
          gameId: "t1",
          slug: "tie-one",
          title: "Tie One",
          coverUrl: null,
        },
        {
          place: 2,
          points: 40,
          gameId: "t2",
          slug: "tie-two",
          title: "Tie Two",
          coverUrl: null,
        },
        {
          place: 3,
          points: 10,
          gameId: "solo",
          slug: "solo",
          title: "Solo",
          coverUrl: null,
        },
      ],
      voices: [],
      voiceColumns: [],
      voterRanks: [],
      viewerProfileId: null,
      includeYou: false,
    });

    expect(rows[0]?.community.map((g) => g.gameId)).toEqual(["t1", "t2"]);
    expect(rows[1]?.community.map((g) => g.gameId)).toEqual(["solo"]);
    expect(rows[2]?.community).toEqual([]);
  });

  it("keeps every Voices game in a rank-10 competition tie", () => {
    const voices = [
      ...Array.from({ length: 9 }, (_, i) => ({
        place: i + 1,
        points: 20 - i,
        gameId: `u${i}`,
        slug: `u${i}`,
        title: `U${i}`,
        coverUrl: null,
      })),
      ...Array.from({ length: 25 }, (_, i) => ({
        place: 10 + i,
        points: 5,
        gameId: `t${i}`,
        slug: `t${i}`,
        title: `T${i}`,
        coverUrl: null,
      })),
    ];
    const rows = assembleBallotMatrixRows({
      top: 10,
      community: [],
      voices,
      voiceColumns: [],
      voterRanks: [],
      viewerProfileId: null,
      includeYou: false,
    });
    expect(rows[9]?.voices).toHaveLength(25);
  });

  it("omits You column data when includeYou is false", () => {
    const rows = assembleBallotMatrixRows({
      top: 2,
      community: [
        {
          place: 1,
          points: 10,
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
    expect(rows[0]?.community[0]?.gameId).toBe("c1");
  });
});

describe("assembleCategoryComparisonRows", () => {
  const voiceColumns = [
    { profileId: "v1", displayName: "Ada", username: "ada" },
    { profileId: "v2", displayName: "Bea", username: "bea" },
  ];

  it("builds award rows with You, Community #1, Voices #1, and Voice picks", () => {
    const rows = assembleCategoryComparisonRows({
      categories: [
        { categoryId: "art", label: "Best Art" },
        { categoryId: "story", label: "Best Story" },
      ],
      communityByCategory: {
        art: [
          {
            gameId: "c-art",
            slug: "comm-art",
            title: "Comm Art",
            coverUrl: null,
          },
        ],
        story: [
          {
            gameId: "c-story",
            slug: "comm-story",
            title: "Comm Story",
            coverUrl: null,
          },
        ],
      },
      voicesByCategory: {
        art: [
          {
            gameId: "vo-art",
            slug: "voices-art",
            title: "Voices Art",
            coverUrl: null,
          },
        ],
      },
      picks: [
        {
          profileId: "me",
          categoryId: "art",
          gameId: "y-art",
          slug: "you-art",
          title: "You Art",
          coverUrl: null,
        },
        {
          profileId: "v1",
          categoryId: "art",
          gameId: "a-art",
          slug: "ada-art",
          title: "Ada Art",
          coverUrl: null,
        },
        {
          profileId: "v2",
          categoryId: "story",
          gameId: "b-story",
          slug: "bea-story",
          title: "Bea Story",
          coverUrl: null,
        },
      ],
      voiceColumns,
      viewerProfileId: "me",
      includeYou: true,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      categoryId: "art",
      label: "Best Art",
      you: { gameId: "y-art" },
      community: [{ gameId: "c-art" }],
      voices: [{ gameId: "vo-art" }],
      voiceGames: {
        v1: { gameId: "a-art" },
        v2: null,
      },
    });
    expect(rows[1]).toMatchObject({
      categoryId: "story",
      you: null,
      community: [{ gameId: "c-story" }],
      voices: [],
      voiceGames: {
        v1: null,
        v2: { gameId: "b-story" },
      },
    });
    expect(categoryComparisonHasGames(rows)).toBe(true);
  });

  it("stacks multiple Community #1s in one category cell", () => {
    const rows = assembleCategoryComparisonRows({
      categories: [{ categoryId: "art", label: "Best Art" }],
      communityByCategory: {
        art: [
          {
            gameId: "c-art-a",
            slug: "a",
            title: "A",
            coverUrl: null,
          },
          {
            gameId: "c-art-b",
            slug: "b",
            title: "B",
            coverUrl: null,
          },
        ],
      },
      voicesByCategory: {},
      picks: [],
      voiceColumns: [],
      viewerProfileId: null,
      includeYou: false,
    });
    expect(rows[0]?.community.map((g) => g.gameId)).toEqual([
      "c-art-a",
      "c-art-b",
    ]);
    expect(categoryComparisonHasGames(rows)).toBe(true);
  });

  it("omits You when includeYou is false", () => {
    const rows = assembleCategoryComparisonRows({
      categories: [{ categoryId: "art", label: "Best Art" }],
      communityByCategory: {},
      voicesByCategory: {},
      picks: [
        {
          profileId: "me",
          categoryId: "art",
          gameId: "y-art",
          slug: "you-art",
          title: "You Art",
          coverUrl: null,
        },
      ],
      voiceColumns: [],
      viewerProfileId: "me",
      includeYou: false,
    });
    expect(rows[0]?.you).toBeNull();
    expect(categoryComparisonHasGames(rows)).toBe(false);
  });
});
