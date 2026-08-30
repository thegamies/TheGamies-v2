import { pointsForRank } from "@/lib/lists/scoring";
import {
  parseSharedRankMode,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";

export type { SharedRankMode };
export { parseSharedRankMode as parseEditionRankMode };

export type EditionResultMode = "combined" | "community" | "voices";

/** Public UI modes until weighted Combined exists. */
export type EditionResultsPublicMode = "community" | "voices";

/** Public name for a results board. `?mode=voices` stays in the URL. */
export function editionBoardLabel(
  mode: EditionResultsPublicMode,
): "Community" | "Hosts" {
  return mode === "voices" ? "Hosts" : "Community";
}

/** Ceremony / results / ballot / host settings shell. */
export type EditionResultsViewId =
  | "entrance"
  | "reveal"
  | "overview"
  | "comparison"
  | "standings"
  | "categories"
  | "category"
  | "voters"
  | "ballot"
  | "settings"
  /** Host results preview while closed (`?view=show` / results / standings / categories). */
  | "show"
  /** @deprecated Prefer `?view=settings&panel=hosts`. */
  | "hosts"
  /** @deprecated Prefer `?view=settings&panel=preview`. */
  | "preview";

/** Sub-tabs inside Event Settings (`?view=settings&panel=`). */
export type EditionSettingsPanelId = "edition" | "hosts" | "preview";

/** Host results preview data: placeholders vs real freeze (separate request). */
export type EditionShowSource = "demo" | "live";

export function parseEditionShowSource(raw: unknown): EditionShowSource {
  return raw === "live" ? "live" : "demo";
}

/** Hosts-only freeze rebuild replaces `voices` rows; Community stays. */
export function hostsRebuildStorageMode(): "voices" {
  return "voices";
}

export function freezeRowsKeptAfterHostsRebuild<T extends { mode: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => row.mode !== hostsRebuildStorageMode());
}

/** Combined (legacy URL) and community share storage rows. */
export function storageModeFor(
  mode: EditionResultMode,
): "community" | "voices" {
  return mode === "voices" ? "voices" : "community";
}

export function parseEditionResultMode(
  raw: string | undefined,
): EditionResultsPublicMode {
  if (raw === "voices") return "voices";
  // "combined" redirects to community until weighted Combined ships
  return "community";
}

export function parseEditionResultsView(
  raw: string | undefined,
): EditionResultsViewId {
  if (raw === "overview" || raw === "results") return "overview";
  if (raw === "comparison") return "comparison";
  if (raw === "standings") return "standings";
  if (raw === "categories") return "categories";
  if (raw === "category") return "category";
  if (raw === "voters") return "voters";
  if (raw === "ballot") return "ballot";
  if (raw === "settings") return "settings";
  if (raw === "hosts") return "hosts";
  if (raw === "preview") return "preview";
  if (raw === "show") return "show";
  if (raw === "reveal") return "reveal";
  if (raw === "entrance") return "entrance";
  // Missing / unknown: callers that need the spoiler entrance resolve bare
  // published URLs themselves; elsewhere default to Reveal.
  return "reveal";
}

export function parseEditionSettingsPanel(
  raw: string | undefined,
): EditionSettingsPanelId {
  if (raw === "hosts") return "hosts";
  if (raw === "preview") return "preview";
  return "edition";
}

/** Normalize legacy `?view=hosts|preview` into settings + panel. */
export function resolveEditionHostSettings(
  view: EditionResultsViewId,
  panelRaw: string | undefined,
): { view: EditionResultsViewId; panel: EditionSettingsPanelId } {
  if (view === "hosts") return { view: "settings", panel: "hosts" };
  if (view === "preview") return { view: "settings", panel: "preview" };
  if (view === "settings") {
    return { view: "settings", panel: parseEditionSettingsPanel(panelRaw) };
  }
  return { view, panel: "edition" };
}

export type RankedBallotLine = {
  profileId: string;
  gameId: string;
  rank: number;
};

export type GameMeta = {
  gameId: string;
  slug: string;
  title: string;
  gameYear: number | null;
  coverUrl: string | null;
};

export type AggregatedGotyRow = GameMeta & {
  place: number;
  points: number;
  firstPlaceVotes: number;
  appearances: number;
};

export type CategoryVoteLine = {
  profileId: string;
  categoryId: string;
  gameId: string;
};

export type AggregatedCategoryRow = GameMeta & {
  categoryId: string;
  place: number;
  votes: number;
};

export type GotyTallyWithMeta = GameMeta & {
  points: number;
  firstPlaceVotes: number;
  appearances: number;
};

export type CategoryTallyWithMeta = GameMeta & {
  categoryId: string;
  votes: number;
};

/**
 * Board order for GOTY tallies.
 * Tie-break: more points, then more #1s, then more appearances, then gameId.
 */
export function placeEditionGotyTallies(
  tallies: GotyTallyWithMeta[],
): AggregatedGotyRow[] {
  const rows = tallies.filter((row) => row.points > 0);
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.firstPlaceVotes !== a.firstPlaceVotes) {
      return b.firstPlaceVotes - a.firstPlaceVotes;
    }
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return a.gameId.localeCompare(b.gameId);
  });
  return rows.map((row, i) => ({ ...row, place: i + 1 }));
}

/** Per-category board order; tie-break votes then gameId. */
export function placeEditionCategoryTallies(
  tallies: CategoryTallyWithMeta[],
): AggregatedCategoryRow[] {
  const byCategory = new Map<string, CategoryTallyWithMeta[]>();
  for (const entry of tallies) {
    if (entry.votes <= 0) continue;
    const list = byCategory.get(entry.categoryId) ?? [];
    list.push(entry);
    byCategory.set(entry.categoryId, list);
  }

  const out: AggregatedCategoryRow[] = [];
  for (const list of byCategory.values()) {
    list.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.gameId.localeCompare(b.gameId);
    });
    list.forEach((row, i) => {
      out.push({ ...row, place: i + 1 });
    });
  }
  return out;
}

/**
 * Aggregate GOTY points for a ballot pool (top-10 pointsForRank).
 * Freeze path aggregates in SQL then uses placeEditionGotyTallies.
 */
export function aggregateEditionGoty(
  lines: RankedBallotLine[],
  games: Map<string, GameMeta>,
  profileFilter?: Set<string>,
): AggregatedGotyRow[] {
  const byGame = new Map<
    string,
    { points: number; firstPlaceVotes: number; appearances: number }
  >();

  for (const line of lines) {
    if (profileFilter && !profileFilter.has(line.profileId)) continue;
    const pts = pointsForRank(line.rank);
    if (pts <= 0 && line.rank > 10) continue;
    if (line.rank > 10) continue;

    const cur = byGame.get(line.gameId) ?? {
      points: 0,
      firstPlaceVotes: 0,
      appearances: 0,
    };
    cur.points += pts;
    cur.appearances += 1;
    if (line.rank === 1) cur.firstPlaceVotes += 1;
    byGame.set(line.gameId, cur);
  }

  const tallies: GotyTallyWithMeta[] = [];
  for (const [gameId, stats] of byGame) {
    const meta = games.get(gameId);
    if (!meta) continue;
    tallies.push({
      ...meta,
      points: stats.points,
      firstPlaceVotes: stats.firstPlaceVotes,
      appearances: stats.appearances,
    });
  }

  return placeEditionGotyTallies(tallies);
}

/**
 * Plurality category tallies.
 * Freeze path aggregates in SQL then uses placeEditionCategoryTallies.
 */
export function aggregateEditionCategories(
  votes: CategoryVoteLine[],
  games: Map<string, GameMeta>,
  profileFilter?: Set<string>,
): AggregatedCategoryRow[] {
  const byKey = new Map<string, { categoryId: string; gameId: string; votes: number }>();

  for (const vote of votes) {
    if (profileFilter && !profileFilter.has(vote.profileId)) continue;
    const key = `${vote.categoryId}:${vote.gameId}`;
    const cur = byKey.get(key) ?? {
      categoryId: vote.categoryId,
      gameId: vote.gameId,
      votes: 0,
    };
    cur.votes += 1;
    byKey.set(key, cur);
  }

  const tallies: CategoryTallyWithMeta[] = [];
  for (const entry of byKey.values()) {
    const meta = games.get(entry.gameId);
    if (!meta) continue;
    tallies.push({
      ...meta,
      categoryId: entry.categoryId,
      votes: entry.votes,
    });
  }

  return placeEditionCategoryTallies(tallies);
}
