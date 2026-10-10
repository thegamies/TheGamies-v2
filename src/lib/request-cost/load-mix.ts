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
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  type LoadtestFixturesFile,
  type LoadtestScenario,
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
  | "tgaOpenYear"
  | "tgaLockedYear"
  | "game"
>;

const sampleUrls: LoadMixUrls = {
  communitySlug: LOADTEST_COMMUNITY.slug,
  fillingYear: LOADTEST_EDITION_FILLING_YEAR,
  resultsYear: LOADTEST_EDITION_RESULTS_YEAR,
  resultsCategoryId: "cat_load",
  tgaOpenYear: LOADTEST_TGA_OPEN_YEAR,
  tgaLockedYear: LOADTEST_TGA_LOCKED_YEAR,
  game: { id: "g1", slug: "sample-game", igdbId: 1 },
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
  ];
}

function pickemGets(year: number): LoadGetItem[] {
  const base = `/the-game-awards/${year}`;
  const community = `/communities/${LOADTEST_COMMUNITY.slug}/the-game-awards/${year}`;
  return [
    { group: "pickem", method: "GET", path: base, weight: 4 },
    {
      group: "pickem",
      method: "GET",
      path: tgaYearHref(base, { view: "standings" }),
      weight: 4,
    },
    { group: "pickem", method: "GET", path: community, weight: 2 },
    {
      group: "pickem",
      method: "GET",
      path: tgaYearHref(community, { view: "standings" }),
      weight: 2,
    },
  ];
}

function editionFillingGets(urls: LoadMixUrls): LoadGetItem[] {
  return [
    {
      group: "edition",
      method: "GET",
      path: `/communities/${urls.communitySlug}/edition/${urls.fillingYear}`,
      weight: 6,
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
): LoadGetItem[] {
  const items = [...generalGets(urls)];
  if (scenario === "pickem-open") {
    items.push(...pickemGets(urls.tgaOpenYear));
  } else if (scenario === "pickem-locked") {
    items.push(...pickemGets(urls.tgaLockedYear));
  } else if (scenario === "editions-filling") {
    items.push(...editionFillingGets(urls));
  } else if (scenario === "editions-results") {
    items.push(...editionResultsGets(urls));
  }
  return items;
}

export function buildLoadWrites(scenario: LoadtestScenario): LoadWriteItem[] {
  const items = [...generalWrites()];
  if (scenario === "pickem-open") {
    items.push({ group: "write", method: "POST", op: "pickem", weight: 4 });
  }
  if (scenario === "editions-filling") {
    items.push({ group: "write", method: "POST", op: "ballot", weight: 4 });
  }
  return items;
}

export function buildLoadMix(
  scenario: LoadtestScenario,
  urls: LoadMixUrls = sampleUrls,
): LoadMixItem[] {
  return [...buildLoadGets(scenario, urls), ...buildLoadWrites(scenario)];
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

export function mixUsesPromotedTgaYear(items: LoadMixItem[]): boolean {
  return items.some(
    (item) =>
      item.method === "GET" &&
      item.group === "pickem" &&
      !item.path.includes(String(LOADTEST_TGA_OPEN_YEAR)) &&
      !item.path.includes(String(LOADTEST_TGA_LOCKED_YEAR)),
  );
}
