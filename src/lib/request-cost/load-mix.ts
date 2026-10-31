import {
  editionCategoryStandingsHref,
  editionResultsHref,
} from "@/lib/communities/edition-results-href";
import {
  AWARD_CATEGORY_DEFS,
  liveStandingsHref,
  siteGotyCategoriesPath,
  siteGotyYearPath,
} from "@/lib/live-aggregate/award-category-defs";
import { tgaYearHref } from "@/lib/tga-pickem/year-href";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_EDITION_FILLING_YEAR,
  LOADTEST_EDITION_RESULTS_YEAR,
  LOADTEST_SHARE_LIST_SLUG,
  LOADTEST_TGA_YEAR,
  LOADTEST_WRITERS_MAX,
  loadtestAccount,
  loadtestTgaYearFromFixtures,
  type LoadtestFixturesFile,
  type LoadtestScenario,
  type LoadtestShareList,
} from "@/lib/qa/loadtest";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";

export type LoadMixGroup = "general" | "pickem" | "edition" | "write";

export type LoadGetItem = {
  group: Exclude<LoadMixGroup, "write">;
  method: "GET";
  path: string;
  weight: number;
  /** Resolve `/games/:slug` from the popular/unpopular fixture pool at request time. */
  pickGame?: boolean;
  /** Resolve a 2025 site category board from the award catalog. */
  pickCategory?: boolean;
  /** Catalog `/games?q=` or list-editor `/api/games/search`. */
  pickSearch?: "browse" | "api";
  /** Resolve `/u/:username` from load-test accounts. */
  pickProfile?: boolean;
  /** Resolve a planted share list at random from `fixtures.lists`. */
  pickShare?: boolean;
  /**
   * Replace the community slug in `path` with a random scale `seed_pem_*`
   * community at request time.
   */
  pickScaleCommunity?: boolean;
};

export type LoadWriteOp =
  | "list-create"
  | "list-edit"
  | "list-reorder"
  | "list-delete"
  | "library"
  | "ballot"
  | "pickem";

export function isListWriteOp(
  op: LoadWriteOp,
): op is "list-create" | "list-edit" | "list-reorder" | "list-delete" {
  return (
    op === "list-create" ||
    op === "list-edit" ||
    op === "list-reorder" ||
    op === "list-delete"
  );
}

export type LoadWriteItem = {
  group: "write";
  method: "POST";
  op: LoadWriteOp;
  weight: number;
};

export type LoadMixItem = LoadGetItem | LoadWriteItem;

export type LoadMixUrls = Pick<
  LoadtestFixturesFile,
  | "communitySlug"
  | "fillingYear"
  | "resultsYear"
  | "resultsCategoryId"
  | "tgaYear"
  | "tgaOpenYear"
  | "tgaLockedYear"
  | "game"
  | "writerCount"
  | "lists"
>;

const sampleUrls: LoadMixUrls = {
  communitySlug: LOADTEST_COMMUNITY.slug,
  fillingYear: LOADTEST_EDITION_FILLING_YEAR,
  resultsYear: LOADTEST_EDITION_RESULTS_YEAR,
  resultsCategoryId: "cat_load",
  tgaYear: LOADTEST_TGA_YEAR,
  game: { id: "g1", slug: "sample-game", igdbId: 1 },
  writerCount: 1,
  lists: [
    {
      username: loadtestAccount(1).username,
      slug: LOADTEST_SHARE_LIST_SLUG,
      publicId: "share1",
    },
  ],
};

/** Site live GOTY year the general mix hammers (real 2025 boards, not load-test years). */
export const LOADTEST_SITE_GOTY_YEAR = 2025;
const LOADTEST_GOTY_CATEGORY_CAP = 12;

export function loadtestGotyCategoryIds(): string[] {
  return AWARD_CATEGORY_DEFS.slice(0, LOADTEST_GOTY_CATEGORY_CAP).map(
    (row) => row.id,
  );
}

export function pickLoadtestGotyCategory(random: () => number = Math.random): string {
  const ids = loadtestGotyCategoryIds();
  return ids[Math.floor(random() * ids.length)]!;
}

export function pickLoadtestUsername(
  writerCount: number,
  random: () => number = Math.random,
): string {
  const n = Math.max(1, Math.min(LOADTEST_WRITERS_MAX, Math.floor(writerCount) || 1));
  const index = 1 + Math.floor(random() * n);
  return loadtestAccount(index).username;
}

export function loadShareListPath(list: LoadtestShareList): string {
  return `/u/${encodeURIComponent(list.username)}/${encodeURIComponent(list.slug)}`;
}

export function siteGotyCategoryPath(categoryId: string, year = LOADTEST_SITE_GOTY_YEAR): string {
  return liveStandingsHref(siteGotyYearPath(year), {
    view: "category",
    category: categoryId,
  });
}

function generalGets(urls: LoadMixUrls): LoadGetItem[] {
  const year = LOADTEST_SITE_GOTY_YEAR;
  const yearPath = siteGotyYearPath(year);
  return [
    { group: "general", method: "GET", path: "/", weight: 5 },
    { group: "general", method: "GET", path: "/games", weight: 3 },
    {
      group: "general",
      method: "GET",
      path: "/games?q=",
      weight: 4,
      pickSearch: "browse",
    },
    {
      group: "general",
      method: "GET",
      path: "/api/games/search",
      weight: 4,
      pickSearch: "api",
    },
    {
      group: "general",
      method: "GET",
      path: `/games/${encodeURIComponent(urls.game.slug)}`,
      weight: 4,
      pickGame: true,
    },
    { group: "general", method: "GET", path: "/rankings", weight: 1 },
    { group: "general", method: "GET", path: "/game-of-the-year", weight: 3 },
    { group: "general", method: "GET", path: yearPath, weight: 5 },
    {
      group: "general",
      method: "GET",
      path: siteGotyCategoriesPath(year),
      weight: 3,
    },
    {
      group: "general",
      method: "GET",
      path: siteGotyCategoryPath(AWARD_CATEGORY_DEFS[0]!.id, year),
      weight: 4,
      pickCategory: true,
    },
    { group: "general", method: "GET", path: "/create", weight: 2 },
    {
      group: "general",
      method: "GET",
      path: `/create/goty?year=${year}`,
      weight: 4,
    },
    { group: "general", method: "GET", path: "/create/custom", weight: 2 },
    {
      group: "general",
      method: "GET",
      path: `/u/${loadtestAccount(1).username}`,
      weight: 3,
      pickProfile: true,
    },
    ...shareGets(urls),
  ];
}

function shareGets(urls: LoadMixUrls): LoadGetItem[] {
  const first = urls.lists?.[0];
  if (!first) return [];
  return [
    {
      group: "general",
      method: "GET",
      path: loadShareListPath(first),
      weight: 6,
      pickShare: true,
    },
  ];
}

export type LoadPickemPhase = "open" | "locked";

export const LOADTEST_PICKEM_LOCK_FRACTION = 0.5;

export function pickemPhaseAt(
  elapsedMs: number,
  durationMs: number,
  fraction = LOADTEST_PICKEM_LOCK_FRACTION,
): LoadPickemPhase {
  if (durationMs <= 0) return "locked";
  return elapsedMs / durationMs >= fraction ? "locked" : "open";
}

function pickemGets(
  year: number,
  phase: LoadPickemPhase,
  communitySlug = LOADTEST_COMMUNITY.slug,
  pickScaleCommunity = false,
): LoadGetItem[] {
  const base = `/the-game-awards/${year}`;
  const community = `/communities/${communitySlug}/the-game-awards/${year}`;
  if (phase === "open") {
    return [
      { group: "pickem", method: "GET", path: base, weight: 6 },
      {
        group: "pickem",
        method: "GET",
        path: community,
        weight: 3,
        pickScaleCommunity,
      },
      {
        group: "pickem",
        method: "GET",
        path: tgaYearHref(base, { view: "standings" }),
        weight: 2,
      },
      {
        group: "pickem",
        method: "GET",
        path: tgaYearHref(community, { view: "standings" }),
        weight: 1,
        pickScaleCommunity,
      },
    ];
  }
  return [
    {
      group: "pickem",
      method: "GET",
      path: tgaYearHref(base, { view: "standings" }),
      weight: 6,
    },
    {
      group: "pickem",
      method: "GET",
      path: tgaYearHref(community, { view: "standings" }),
      weight: 4,
      pickScaleCommunity,
    },
    {
      group: "pickem",
      method: "GET",
      path: tgaYearHref(community, { view: "standings", mode: "voices" }),
      weight: 2,
      pickScaleCommunity,
    },
    { group: "pickem", method: "GET", path: base, weight: 1 },
  ];
}

function editionFillingGets(
  urls: LoadMixUrls,
  pickScaleCommunity = false,
): LoadGetItem[] {
  return [
    {
      group: "edition",
      method: "GET",
      path: `/communities/${urls.communitySlug}/edition/${urls.fillingYear}`,
      weight: 6,
      pickScaleCommunity,
    },
  ];
}

function editionResultsGets(urls: LoadMixUrls): LoadGetItem[] {
  const slug = urls.communitySlug;
  const year = urls.resultsYear;
  return [
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "overview" }),
      weight: 4,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "reveal" }),
      weight: 2,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "standings" }),
      weight: 3,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { mode: "voices", view: "standings" }),
      weight: 2,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "categories" }),
      weight: 2,
    },
    {
      group: "edition",
      method: "GET",
      path: editionCategoryStandingsHref(slug, year, urls.resultsCategoryId),
      weight: 2,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "comparison" }),
      weight: 1,
    },
    {
      group: "edition",
      method: "GET",
      path: editionResultsHref(slug, year, { view: "voters" }),
      weight: 1,
    },
  ];
}

function generalWrites(): LoadWriteItem[] {
  return [
    { group: "write", method: "POST", op: "list-create", weight: 2 },
    { group: "write", method: "POST", op: "list-edit", weight: 2 },
    { group: "write", method: "POST", op: "list-reorder", weight: 1 },
    { group: "write", method: "POST", op: "list-delete", weight: 1 },
    { group: "write", method: "POST", op: "library", weight: 2 },
  ];
}

export function buildLoadGets(
  scenario: LoadtestScenario,
  urls: LoadMixUrls = sampleUrls,
  pickemPhase: LoadPickemPhase = "open",
): LoadGetItem[] {
  const items = [...generalGets(urls)];
  if (scenario === "pickem") {
    items.push(...pickemGets(loadtestTgaYearFromFixtures(urls), pickemPhase));
  } else if (scenario === "editions") {
    items.push(
      ...(pickemPhase === "locked"
        ? editionResultsGets(urls)
        : editionFillingGets(urls)),
    );
  } else if (scenario === "scale") {
    // Multi-community Pick’em + open editions. Editions stay open (no
    // mass-publish). Pick’em still flips site standings at halfway.
    items.push(
      ...pickemGets(
        loadtestTgaYearFromFixtures(urls),
        pickemPhase,
        urls.communitySlug,
        true,
      ),
      ...editionFillingGets(urls, true),
    );
  }
  return items;
}

export function buildLoadWrites(
  scenario: LoadtestScenario,
  pickemPhase: LoadPickemPhase = "open",
): LoadWriteItem[] {
  const items = [...generalWrites()];
  if (
    (scenario === "pickem" || scenario === "scale") &&
    pickemPhase === "open"
  ) {
    items.push({ group: "write", method: "POST", op: "pickem", weight: 4 });
  }
  if (
    (scenario === "editions" || scenario === "scale") &&
    pickemPhase === "open"
  ) {
    items.push({ group: "write", method: "POST", op: "ballot", weight: 4 });
  }
  return items;
}

/** Swap the community slug segment for a random scale community. */
export function withScaleCommunitySlug(
  pathName: string,
  fromSlug: string,
  toSlug: string,
): string {
  return pathName.split(`/communities/${fromSlug}/`).join(
    `/communities/${toSlug}/`,
  );
}

export function buildLoadMix(
  scenario: LoadtestScenario,
  urls: LoadMixUrls = sampleUrls,
  pickemPhase: LoadPickemPhase = "open",
): LoadMixItem[] {
  return [
    ...buildLoadGets(scenario, urls, pickemPhase),
    ...buildLoadWrites(scenario, pickemPhase),
  ];
}

export function pickWeighted<T extends { weight: number }>(
  items: T[],
  random: () => number = Math.random,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1]!;
}

export function mixUsesShowcaseSlug(items: LoadMixItem[]): boolean {
  const needle = `/communities/${QA_COMMUNITIES.showcase.slug}`;
  return items.some(
    (item) => item.method === "GET" && item.path.includes(needle),
  );
}

export function mixUsesUnexpectedTgaYear(items: LoadMixItem[]): boolean {
  const year = String(LOADTEST_TGA_YEAR);
  return items.some(
    (item) =>
      item.method === "GET" &&
      item.group === "pickem" &&
      !item.path.includes(year),
  );
}
