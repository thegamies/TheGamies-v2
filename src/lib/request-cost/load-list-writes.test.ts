import { describe, expect, it } from "vitest";
import {
  LOADTEST_LIST_ITEM_MAX,
  LOADTEST_LIST_ITEM_MIN,
  type LoadtestFixturesFile,
} from "@/lib/qa/loadtest";
import {
  applyListWriteState,
  deleteSomeListItems,
  emptyWriterListState,
  listDraftForOp,
  listWriteNeedsSeed,
  parseListWritePublicId,
  randomLoadListSize,
  reorderListItems,
} from "./load-list-writes";

const fixtures = {
  game: { id: "g1", slug: "one", igdbId: 1, band: "popular" },
  games: [
    { id: "g1", slug: "one", igdbId: 1, band: "popular" },
    { id: "g2", slug: "two", igdbId: 2, band: "popular" },
    { id: "g3", slug: "three", igdbId: 3, band: "unpopular" },
  ],
} as unknown as LoadtestFixturesFile;

describe("list write mix helpers", () => {
  it("picks a size between 1 and 10", () => {
    expect(randomLoadListSize(() => 0)).toBe(LOADTEST_LIST_ITEM_MIN);
    expect(randomLoadListSize(() => 0.999)).toBe(LOADTEST_LIST_ITEM_MAX);
  });

  it("shuffles ranks without dropping games", () => {
    const items = [
      { igdbId: 1, rank: 1 },
      { igdbId: 2, rank: 2 },
      { igdbId: 3, rank: 3 },
    ];
    const next = reorderListItems(items, () => 0);
    expect(next.map((row) => row.igdbId).sort()).toEqual([1, 2, 3]);
    expect(next.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(next.map((row) => row.igdbId)).not.toEqual([1, 2, 3]);
  });

  it("deletes at least one game", () => {
    const items = [
      { igdbId: 1, rank: 1 },
      { igdbId: 2, rank: 2 },
    ];
    expect(deleteSomeListItems(items, () => 0)).toEqual([{ igdbId: 1, rank: 1 }]);
    expect(deleteSomeListItems(items, () => 0.99)).toEqual([]);
  });

  it("labels create vs edit vs reorder vs delete", () => {
    const created = listDraftForOp("list-create", fixtures, emptyWriterListState(), () => 0);
    expect(created?.publicId).toBeUndefined();
    expect(created?.items.length).toBeGreaterThanOrEqual(1);

    const state = {
      publicId: "abc",
      items: [
        { igdbId: 1, rank: 1 },
        { igdbId: 2, rank: 2 },
      ],
    };
    expect(listDraftForOp("list-edit", fixtures, state, () => 0)?.publicId).toBe(
      "abc",
    );
    expect(
      listDraftForOp("list-reorder", fixtures, state, () => 0)?.items.map(
        (row) => row.igdbId,
      ),
    ).not.toEqual([1, 2]);
    expect(listDraftForOp("list-delete", fixtures, state, () => 0)?.items).toEqual([
      { igdbId: 1, rank: 1 },
    ]);
  });

  it("seeds edit/reorder/delete when the writer has no list", () => {
    expect(listWriteNeedsSeed("list-create", emptyWriterListState())).toBe(false);
    expect(listWriteNeedsSeed("list-edit", emptyWriterListState())).toBe(true);
    expect(
      listWriteNeedsSeed("list-reorder", {
        publicId: "x",
        items: [{ igdbId: 1, rank: 1 }],
      }),
    ).toBe(true);
    expect(
      listWriteNeedsSeed("list-delete", { publicId: "x", items: [] }),
    ).toBe(true);
  });

  it("stores publicId from the API body", () => {
    const state = emptyWriterListState();
    applyListWriteState(
      state,
      { title: "Load", items: [{ igdbId: 9, rank: 1 }] },
      parseListWritePublicId('{"ok":true,"publicId":"lst_1"}'),
    );
    expect(state.publicId).toBe("lst_1");
    expect(state.items).toEqual([{ igdbId: 9, rank: 1 }]);
  });
});
