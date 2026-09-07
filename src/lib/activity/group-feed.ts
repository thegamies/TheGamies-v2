import type { ActivityKind } from "./kinds";

export type FeedEventRow = {
  id: string;
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  kind: ActivityKind;
  batchId: string;
  createdAt: Date;
  gameId: string | null;
  gameSlug: string | null;
  gameTitle: string | null;
  coverUrl: string | null;
  listId: string | null;
  listSlug: string | null;
  listTitle: string | null;
  listYear: number | null;
};

export type FeedCardGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  kind: ActivityKind;
  createdAt: Date;
};

export type FeedLibrarySection = {
  type: "library";
  kind: ActivityKind;
  games: FeedCardGame[];
};

export type FeedListSection = {
  type: "list";
  listSlug: string | null;
  listTitle: string | null;
  listYear: number | null;
  added: FeedCardGame[];
  removed: FeedCardGame[];
  revealed: boolean;
};

export type FeedCardSection = FeedLibrarySection | FeedListSection;

export type FeedCard = {
  key: string;
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
  sections: FeedCardSection[];
};

type MutableLibrarySection = FeedLibrarySection & { latestAt: number };
type MutableListSection = FeedListSection & { latestAt: number; listId: string | null };
type MutableSection = MutableLibrarySection | MutableListSection;

type MutableCard = Omit<FeedCard, "sections"> & {
  sections: MutableSection[];
};

function gameFromRow(row: FeedEventRow): FeedCardGame | null {
  if (!row.gameId || !row.gameSlug || !row.gameTitle) return null;
  return {
    gameId: row.gameId,
    slug: row.gameSlug,
    title: row.gameTitle,
    coverUrl: row.coverUrl,
    kind: row.kind,
    createdAt: row.createdAt,
  };
}

function utcDayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function pushUnique(games: FeedCardGame[], game: FeedCardGame) {
  const existing = games.find((item) => item.gameId === game.gameId);
  if (!existing) {
    games.push(game);
    return;
  }
  if (game.createdAt > existing.createdAt) existing.createdAt = game.createdAt;
}

function sortGames(games: FeedCardGame[]): FeedCardGame[] {
  return [...games].sort((a, b) => {
    const byTime = b.createdAt.getTime() - a.createdAt.getTime();
    if (byTime !== 0) return byTime;
    return a.gameId.localeCompare(b.gameId);
  });
}

function emptyCard(row: FeedEventRow, key: string): MutableCard {
  return {
    key,
    profileId: row.profileId,
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    sections: [],
  };
}

function touch(section: MutableSection, at: Date) {
  const ms = at.getTime();
  if (ms > section.latestAt) section.latestAt = ms;
}

function mergeRow(card: MutableCard, row: FeedEventRow) {
  if (row.createdAt > card.createdAt) card.createdAt = row.createdAt;

  if (row.kind === "list_reveal") {
    const existing = card.sections.find(
      (section): section is MutableListSection =>
        section.type === "list" &&
        (row.listId
          ? section.listId === row.listId
          : section.listSlug === row.listSlug),
    );
    if (existing) {
      existing.revealed = true;
      if (row.listSlug) existing.listSlug = row.listSlug;
      if (row.listTitle) existing.listTitle = row.listTitle;
      if (row.listYear != null) existing.listYear = row.listYear;
      touch(existing, row.createdAt);
      return;
    }
    card.sections.push({
      type: "list",
      listId: row.listId,
      listSlug: row.listSlug,
      listTitle: row.listTitle,
      listYear: row.listYear,
      added: [],
      removed: [],
      revealed: true,
      latestAt: row.createdAt.getTime(),
    });
    return;
  }

  if (row.kind === "list_add" || row.kind === "list_remove") {
    let section = card.sections.find(
      (item): item is MutableListSection =>
        item.type === "list" &&
        (row.listId
          ? item.listId === row.listId
          : item.listSlug === row.listSlug),
    );
    if (!section) {
      section = {
        type: "list",
        listId: row.listId,
        listSlug: row.listSlug,
        listTitle: row.listTitle,
        listYear: row.listYear,
        added: [],
        removed: [],
        revealed: false,
        latestAt: row.createdAt.getTime(),
      };
      card.sections.push(section);
    } else {
      if (row.listSlug) section.listSlug = row.listSlug;
      if (row.listTitle) section.listTitle = row.listTitle;
      if (row.listYear != null) section.listYear = row.listYear;
      touch(section, row.createdAt);
    }
    const game = gameFromRow(row);
    if (!game) return;
    if (row.kind === "list_add") pushUnique(section.added, game);
    else pushUnique(section.removed, game);
    return;
  }

  const game = gameFromRow(row);
  if (!game) return;
  let section = card.sections.find(
    (item): item is MutableLibrarySection =>
      item.type === "library" && item.kind === row.kind,
  );
  if (!section) {
    section = {
      type: "library",
      kind: row.kind,
      games: [],
      latestAt: row.createdAt.getTime(),
    };
    card.sections.push(section);
  } else {
    touch(section, row.createdAt);
  }
  pushUnique(section.games, game);
}

function finalizeCard(card: MutableCard): FeedCard {
  const sections = [...card.sections]
    .sort((a, b) => b.latestAt - a.latestAt)
    .map((section) => {
      if (section.type === "library") {
        return {
          type: "library" as const,
          kind: section.kind,
          games: sortGames(section.games),
        };
      }
      return {
        type: "list" as const,
        listSlug: section.listSlug,
        listTitle: section.listTitle,
        listYear: section.listYear,
        added: sortGames(section.added),
        removed: sortGames(section.removed),
        revealed: section.revealed,
      };
    });
  return {
    key: card.key,
    profileId: card.profileId,
    displayName: card.displayName,
    username: card.username,
    avatarUrl: card.avatarUrl,
    createdAt: card.createdAt,
    sections,
  };
}

/**
 * One card per person per UTC day. Newest person-day first
 * (sort key = that person's latest event that day).
 */
export function groupFeedEvents(rows: readonly FeedEventRow[]): FeedCard[] {
  const cards: MutableCard[] = [];
  const open = new Map<string, MutableCard>();

  for (const row of rows) {
    const key = `${row.profileId}:${utcDayKey(row.createdAt)}`;
    const existing = open.get(key);
    if (existing) {
      mergeRow(existing, row);
      continue;
    }
    const card = emptyCard(row, key);
    mergeRow(card, row);
    open.set(key, card);
    cards.push(card);
  }

  return cards
    .map(finalizeCard)
    .sort((a, b) => {
      const byTime = b.createdAt.getTime() - a.createdAt.getTime();
      if (byTime !== 0) return byTime;
      return a.key.localeCompare(b.key);
    });
}

/** Newest-first games from a person-day card (library and list ticks). */
export function flattenFeedCardGames(card: FeedCard): FeedCardGame[] {
  const games: FeedCardGame[] = [];
  for (const section of card.sections) {
    if (section.type === "library") {
      games.push(...section.games);
      continue;
    }
    games.push(...section.added, ...section.removed);
  }
  return sortGames(games);
}
