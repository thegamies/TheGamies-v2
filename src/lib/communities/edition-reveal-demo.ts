import {
  assembleBallotMatrixRows,
  assembleCategoryComparisonRows,
  categoryComparisonHasGames,
  matrixHasAnyGames,
  type MatrixVoiceColumn,
} from "@/lib/communities/edition-ballot-matrix";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";

export type EditionRevealDemoCategory = {
  id: string;
  label: string;
  description: string | null;
};

/** Placeholder cover art for host results preview (neutral tile, not a real game). */
export const EDITION_REVEAL_DEMO_COVER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="264" height="352" viewBox="0 0 264 352">
      <rect width="264" height="352" fill="#2b2a28"/>
      <rect x="24" y="24" width="216" height="304" fill="none" stroke="#aaa69e" stroke-width="2"/>
      <text x="132" y="180" text-anchor="middle" fill="#aaa69e" font-family="system-ui,sans-serif" font-size="18" font-weight="700">Cover</text>
    </svg>`,
  );

const DEMO_HOST_COLUMNS: MatrixVoiceColumn[] = [
  {
    profileId: "demo-host-a",
    displayName: "Host A",
    username: "host_a",
  },
  {
    profileId: "demo-host-b",
    displayName: "Host B",
    username: "host_b",
  },
];

function demoGame(n: number): {
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string;
} {
  return {
    gameId: `demo-game-${n}`,
    slug: `demo-game-${n}`,
    title: `Game ${n}`,
    year: null,
    coverUrl: EDITION_REVEAL_DEMO_COVER,
  };
}

function demoGotyRows(count: number): EditionGotyStandingRow[] {
  return Array.from({ length: count }, (_, i) => {
    const place = i + 1;
    const game = demoGame(place);
    return {
      place,
      rank: place,
      gameId: game.gameId,
      slug: game.slug,
      title: game.title,
      year: game.year,
      coverUrl: game.coverUrl,
      points: Math.max(1, 100 - place * 3),
      firstPlaceVotes: place === 1 ? 3 : place <= 3 ? 1 : 0,
      appearances: Math.max(1, 30 - place),
    };
  });
}

function standingLinesFromGoty(rows: EditionGotyStandingRow[]) {
  return rows.map((r) => ({
    place: r.place,
    points: r.points,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    coverUrl: r.coverUrl,
  }));
}

function buildDemoComparison(
  topTen: EditionGotyStandingRow[],
  categoryPodiums: EditionCategoryStandingBlock[],
): {
  matrix: EditionBallotMatrix;
  categoryComparison: EditionCategoryComparisonMatrix;
} {
  const voicesBoard = demoGotyRows(10).map((r) => {
    const game = demoGame(r.place + 10);
    return {
      ...r,
      gameId: game.gameId,
      slug: game.slug,
      title: game.title,
      coverUrl: game.coverUrl,
    };
  });

  const voterRanks = DEMO_HOST_COLUMNS.flatMap((col, colIndex) =>
    Array.from({ length: 10 }, (_, i) => {
      const place = i + 1;
      const game = demoGame(place + 20 + colIndex * 10);
      return {
        profileId: col.profileId,
        rank: place,
        gameId: game.gameId,
        slug: game.slug,
        title: game.title,
        coverUrl: game.coverUrl,
      };
    }),
  );

  const matrixRows = assembleBallotMatrixRows({
    community: standingLinesFromGoty(topTen),
    voices: standingLinesFromGoty(voicesBoard),
    voiceColumns: DEMO_HOST_COLUMNS,
    voterRanks,
    viewerProfileId: null,
    includeYou: false,
  });

  const communityByCategory: Record<
    string,
    Array<{
      gameId: string;
      slug: string;
      title: string;
      coverUrl: string | null;
    }>
  > = {};
  const voicesByCategory: Record<
    string,
    Array<{
      gameId: string;
      slug: string;
      title: string;
      coverUrl: string | null;
    }>
  > = {};
  const picks = DEMO_HOST_COLUMNS.flatMap((col, colIndex) =>
    categoryPodiums.map((cat, catIndex) => {
      const game = demoGame(catIndex * 3 + 1 + colIndex * 30);
      return {
        profileId: col.profileId,
        categoryId: cat.categoryId,
        gameId: `${cat.categoryId}-demo-host-${colIndex}`,
        slug: game.slug,
        title: game.title,
        coverUrl: game.coverUrl,
      };
    }),
  );

  for (const [catIndex, cat] of categoryPodiums.entries()) {
    communityByCategory[cat.categoryId] = cat.rows
      .filter((r) => r.rank === 1)
      .map((r) => ({
        gameId: r.gameId,
        slug: r.slug,
        title: r.title,
        coverUrl: r.coverUrl,
      }));
    const voicesWinner = demoGame(50 + catIndex);
    voicesByCategory[cat.categoryId] = [
      {
        gameId: `${cat.categoryId}-demo-voices-1`,
        slug: voicesWinner.slug,
        title: voicesWinner.title,
        coverUrl: voicesWinner.coverUrl,
      },
    ];
  }

  const categoryRows = assembleCategoryComparisonRows({
    categories: categoryPodiums.map((c) => ({
      categoryId: c.categoryId,
      label: c.label,
    })),
    communityByCategory,
    voicesByCategory,
    picks,
    voiceColumns: DEMO_HOST_COLUMNS,
    viewerProfileId: null,
    includeYou: false,
  });

  return {
    matrix: {
      showYou: false,
      hasGames: matrixHasAnyGames(matrixRows),
      voiceColumns: DEMO_HOST_COLUMNS,
      rows: matrixRows,
    },
    categoryComparison: {
      showYou: false,
      hasGames: categoryComparisonHasGames(categoryRows),
      voiceColumns: DEMO_HOST_COLUMNS,
      rows: categoryRows,
    },
  };
}

/**
 * Fixture host preview payload: GOTY board, Top 10, category podiums,
 * and Comparison matrices. No real titles — hosts rehearse without spoilers.
 */
export function buildEditionRevealDemoStandings(
  categories: EditionRevealDemoCategory[],
  opts: { gotyCount?: number } = {},
): {
  topTen: EditionGotyStandingRow[];
  gotyBoard: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
  matrix: EditionBallotMatrix;
  categoryComparison: EditionCategoryComparisonMatrix;
} {
  const gotyCount = Math.max(10, Math.floor(opts.gotyCount ?? 24));
  const gotyBoard = demoGotyRows(gotyCount);
  const topTen = gotyBoard.filter((r) => r.rank <= 10);

  const categoryPodiums: EditionCategoryStandingBlock[] = categories.map(
    (cat, catIndex) => ({
      categoryId: cat.id,
      label: cat.label,
      description: cat.description,
      rows: [1, 2, 3].map((place) => {
        const n = catIndex * 3 + place;
        const game = demoGame(n);
        return {
          place,
          rank: place,
          gameId: `${cat.id}-demo-${place}`,
          slug: game.slug,
          title: game.title,
          coverUrl: game.coverUrl,
          votes: Math.max(1, 20 - place * 5),
        };
      }),
    }),
  );

  const { matrix, categoryComparison } = buildDemoComparison(
    topTen,
    categoryPodiums,
  );

  return {
    topTen,
    gotyBoard,
    categoryPodiums,
    matrix,
    categoryComparison,
  };
}
