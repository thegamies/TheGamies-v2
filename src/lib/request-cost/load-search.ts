import { gamesBrowseHref } from "@/lib/activity/paths";
import {
  loadtestWriteGames,
  pickLoadtestGame,
  type LoadtestFixturesFile,
  type LoadtestGame,
} from "@/lib/qa/loadtest";
import { pickWeighted } from "@/lib/request-cost/load-mix";

export type LoadSearchKind = "title" | "partial" | "short";
export type LoadSearchSurface = "browse" | "api";

export type LoadSearchPick = {
  q: string;
  kind: LoadSearchKind;
};

/** Full title most often; some mid-length tokens; a few 2–3 character prefixes. */
const SEARCH_KIND_WEIGHTS: Array<{ kind: LoadSearchKind; weight: number }> = [
  { kind: "title", weight: 6 },
  { kind: "partial", weight: 2 },
  { kind: "short", weight: 1 },
];

export function loadSearchTitle(game: LoadtestGame): string {
  const title = game.title?.trim();
  if (title) return title;
  return game.slug.replace(/-/g, " ").trim() || game.slug;
}

function lettersAndDigits(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]+/g, "");
}

function shortQuery(title: string, random: () => number): string {
  const compact = lettersAndDigits(title);
  const source = compact.length >= 2 ? compact : lettersAndDigits(title.replace(/\s+/g, "")) || title;
  const n = random() < 0.5 ? 2 : 3;
  const q = source.slice(0, Math.min(n, source.length)).trim();
  return q.length >= 2 ? q : source.slice(0, 2) || "aa";
}

function partialQuery(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const word = words.find((w) => w.length >= 4);
  if (word && word !== title) return word;
  if (title.length <= 3) return title;
  const n = Math.min(Math.max(4, Math.floor(title.length / 2)), title.length - 1);
  return title.slice(0, n).trim() || title;
}

export function pickLoadSearchQuery(
  pool: LoadtestGame[],
  random: () => number = Math.random,
): LoadSearchPick {
  const game = pickLoadtestGame(pool, random);
  const title = loadSearchTitle(game);
  if (title.length <= 3) {
    return { q: title.length >= 2 ? title : shortQuery(title, random), kind: "short" };
  }
  const kind = pickWeighted(SEARCH_KIND_WEIGHTS, random).kind;
  if (kind === "title") return { q: title, kind: "title" };
  if (kind === "short") return { q: shortQuery(title, random), kind: "short" };
  return { q: partialQuery(title), kind: "partial" };
}

export function loadGamesSearchPath(
  surface: LoadSearchSurface,
  fixtures: Pick<LoadtestFixturesFile, "game" | "games">,
  random: () => number = Math.random,
): string {
  const { q } = pickLoadSearchQuery(loadtestWriteGames(fixtures), random);
  if (surface === "api") {
    return `/api/games/search?q=${encodeURIComponent(q)}`;
  }
  return gamesBrowseHref({ q });
}
