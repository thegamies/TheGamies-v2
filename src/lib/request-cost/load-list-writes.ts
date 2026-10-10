import {
  LOADTEST_LIST_ITEM_MAX,
  LOADTEST_LIST_ITEM_MIN,
  loadtestWriteGames,
  pickLoadtestGames,
  type LoadtestFixturesFile,
} from "@/lib/qa/loadtest";
import type { LoadWriteOp } from "./load-mix";

export type LoadListDraftItem = { igdbId: number; rank: number };

export type WriterListState = {
  publicId: string | null;
  items: LoadListDraftItem[];
};

export function emptyWriterListState(): WriterListState {
  return { publicId: null, items: [] };
}

export function randomLoadListSize(random: () => number = Math.random): number {
  return (
    LOADTEST_LIST_ITEM_MIN +
    Math.floor(
      random() * (LOADTEST_LIST_ITEM_MAX - LOADTEST_LIST_ITEM_MIN + 1),
    )
  );
}

function fallbackItem(fixtures: LoadtestFixturesFile): LoadListDraftItem {
  return { igdbId: fixtures.game.igdbId, rank: 1 };
}

export function pickListDraftItems(
  fixtures: LoadtestFixturesFile,
  count: number,
  random?: () => number,
): LoadListDraftItem[] {
  const items = pickLoadtestGames(
    loadtestWriteGames(fixtures),
    Math.max(1, count),
    random,
  ).map((game, rank) => ({ igdbId: game.igdbId, rank: rank + 1 }));
  return items.length > 0 ? items : [fallbackItem(fixtures)];
}

export function uniqueLoadListTitle(random: () => number = Math.random): string {
  return `Load ${Date.now().toString(36)}-${Math.floor(random() * 1e6)}`;
}

export function reorderListItems(
  items: LoadListDraftItem[],
  random: () => number = Math.random,
): LoadListDraftItem[] {
  if (items.length < 2) return items.map((item, rank) => ({ ...item, rank: rank + 1 }));
  const igdbIds = items.map((item) => item.igdbId);
  for (let i = igdbIds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = igdbIds[i]!;
    igdbIds[i] = igdbIds[j]!;
    igdbIds[j] = a;
  }
  const same = igdbIds.every((id, i) => id === items[i]?.igdbId);
  if (same) {
    const first = igdbIds[0]!;
    igdbIds[0] = igdbIds[1]!;
    igdbIds[1] = first;
  }
  return igdbIds.map((igdbId, rank) => ({ igdbId, rank: rank + 1 }));
}

export function deleteSomeListItems(
  items: LoadListDraftItem[],
  random: () => number = Math.random,
): LoadListDraftItem[] {
  if (items.length === 0) return [];
  const drop = 1 + Math.floor(random() * items.length);
  return items
    .slice(0, items.length - drop)
    .map((item, rank) => ({ igdbId: item.igdbId, rank: rank + 1 }));
}

export function listWriteNeedsExisting(op: LoadWriteOp): boolean {
  return op === "list-edit" || op === "list-reorder" || op === "list-delete";
}

export function listWriteNeedsSeed(op: LoadWriteOp, state: WriterListState): boolean {
  if (!listWriteNeedsExisting(op)) return false;
  if (!state.publicId) return true;
  if (op === "list-reorder") return state.items.length < 2;
  if (op === "list-delete") return state.items.length === 0;
  return false;
}

export function seedListDraft(
  op: LoadWriteOp,
  fixtures: LoadtestFixturesFile,
  random: () => number = Math.random,
): { title: string; items: LoadListDraftItem[] } {
  const min = op === "list-reorder" ? 2 : 1;
  return {
    title: uniqueLoadListTitle(random),
    items: pickListDraftItems(
      fixtures,
      Math.max(min, randomLoadListSize(random)),
      random,
    ),
  };
}

export type ListWriteDraft = {
  title: string;
  items: LoadListDraftItem[];
  publicId?: string;
};

export function listDraftForOp(
  op: LoadWriteOp,
  fixtures: LoadtestFixturesFile,
  state: WriterListState,
  random: () => number = Math.random,
): ListWriteDraft | null {
  if (op === "list-create") {
    return {
      title: uniqueLoadListTitle(random),
      items: pickListDraftItems(fixtures, randomLoadListSize(random), random),
    };
  }
  if (op === "list-edit") {
    if (!state.publicId) return null;
    return {
      title: "Load test list",
      publicId: state.publicId,
      items: pickListDraftItems(fixtures, randomLoadListSize(random), random),
    };
  }
  if (op === "list-reorder") {
    if (!state.publicId || state.items.length < 2) return null;
    return {
      title: "Load test list",
      publicId: state.publicId,
      items: reorderListItems(state.items, random),
    };
  }
  if (op === "list-delete") {
    if (!state.publicId || state.items.length === 0) return null;
    return {
      title: "Load test list",
      publicId: state.publicId,
      items: deleteSomeListItems(state.items, random),
    };
  }
  return null;
}

export function listWriteJsonBody(op: LoadWriteOp, draft: ListWriteDraft) {
  return {
    op,
    draft: {
      listType: "custom" as const,
      title: draft.title,
      items: draft.items,
      ...(draft.publicId ? { publicId: draft.publicId } : {}),
    },
  };
}

export function parseListWritePublicId(text: string): string | null {
  try {
    const json = JSON.parse(text) as { publicId?: unknown };
    return typeof json.publicId === "string" && json.publicId.length > 0
      ? json.publicId
      : null;
  } catch {
    return null;
  }
}

export function applyListWriteState(
  state: WriterListState,
  draft: ListWriteDraft,
  publicId: string | null,
): void {
  state.publicId = publicId ?? draft.publicId ?? state.publicId;
  state.items = draft.items;
}
