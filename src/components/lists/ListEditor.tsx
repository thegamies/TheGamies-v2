"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  publishListAction,
  resetDraftAction,
  saveListItemsAction,
} from "@/app/create/actions";
import {
  searchGamesForList,
  type GameSearchHit,
} from "@/app/create/search-actions";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import { LIST_MAX_ITEMS } from "@/lib/lists/schema";

export type EditorItem = {
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  rank: number;
};

type ListEditorProps = {
  publicId: string;
  listType: "goty" | "custom";
  initialTitle: string;
  initialYear: number | null;
  initialItems: EditorItem[];
  error?: string | null;
};

export function ListEditor({
  publicId,
  listType,
  initialTitle,
  initialYear,
  initialItems,
  error = null,
}: ListEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(initialYear?.toString() ?? "");
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [saveError, setSaveError] = useState<string | null>(error);
  const [pending, startTransition] = useTransition();
  const [searchPending, startSearch] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const yearNum = year ? Number(year) : undefined;
        const next = await searchGamesForList({
          q,
          year: listType === "goty" ? yearNum : undefined,
          gotyMode: listType === "goty",
        });
        setHits(next);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, year, listType]);

  const visibleHits = query.trim().length >= 2 ? hits : [];

  function itemsJson() {
    return JSON.stringify(
      items.map((item, index) => ({
        gameId: item.gameId,
        rank: index + 1,
      })),
    );
  }

  function addGame(hit: GameSearchHit) {
    if (items.some((i) => i.gameId === hit.id)) return;
    if (items.length >= LIST_MAX_ITEMS) {
      setSaveError(`Lists can hold at most ${LIST_MAX_ITEMS} games.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        gameId: hit.id,
        slug: hit.slug,
        title: hit.title,
        year: hit.year,
        coverUrl: hit.coverUrl,
        rank: prev.length + 1,
      },
    ]);
    setQuery("");
    setHits([]);
    setSaveError(null);
  }

  function removeAt(index: number) {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        rank: i + 1,
      })),
    );
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy.map((item, i) => ({ ...item, rank: i + 1 }));
    });
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("publicId", publicId);
      fd.set("itemsJson", itemsJson());
      fd.set("title", title);
      if (year) fd.set("year", year);
      const result = await saveListItemsAction(null, fd);
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      setSaveError(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="space-y-6">
        <div className="space-y-4 border-b border-line pb-6">
          <label className="block text-sm text-muted">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>
          <label className="block text-sm text-muted">
            Year
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required={listType === "goty"}
              className="mt-1 block w-32 border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>
        </div>

        <div>
          <label className="block text-sm text-muted">
            Add a game
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalog"
              className="mt-1 block w-full border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>
          {searchPending ? (
            <p className="mt-2 text-sm text-muted">Searching…</p>
          ) : null}
          {visibleHits.length > 0 ? (
            <ul className="mt-3 divide-y divide-line border border-line">
              {visibleHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => addGame(hit)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-panel"
                  >
                    <div className="w-10 shrink-0">
                      <GameCover title={hit.title} imageUrl={hit.coverUrl} />
                    </div>
                    <span className="text-sm text-ink">
                      {hit.title}
                      {hit.year ? (
                        <span className="text-muted"> · {hit.year}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <form action={publishListAction}>
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="listType" value={listType} />
            <input type="hidden" name="itemsJson" value={itemsJson()} />
            <input type="hidden" name="title" value={title} />
            {year ? <input type="hidden" name="year" value={year} /> : null}
            <Button type="submit" variant="accent" disabled={items.length === 0}>
              Publish
            </Button>
          </form>
          <form action={resetDraftAction}>
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="listType" value={listType} />
            <Button type="submit" variant="bordered">
              Reset list
            </Button>
          </form>
          <Link
            href="/create"
            className="inline-flex items-center text-sm text-muted hover:text-ink"
          >
            Back
          </Link>
        </div>

        {saveError ? (
          <p className="text-sm text-accent" role="alert">
            {saveError}
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {items.length} / {LIST_MAX_ITEMS} games
        </p>
      </section>

      <section>
        <ol className="divide-y divide-line border-y border-line">
          {items.length === 0 ? (
            <li className="py-8 text-muted">
              No games yet. Search the catalog to start ranking.
            </li>
          ) : (
            items.map((item, index) => (
              <li
                key={item.gameId}
                className="flex items-center gap-4 py-4"
              >
                <RankMarker rank={index + 1} size="md" />
                <div className="w-14 shrink-0">
                  <GameCover title={item.title} imageUrl={item.coverUrl} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{item.title}</p>
                  {item.year ? (
                    <p className="text-sm text-muted">{item.year}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="quiet"
                    className="px-2"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    className="px-2"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    className="px-2"
                    onClick={() => removeAt(index)}
                    aria-label="Remove"
                  >
                    ×
                  </Button>
                </div>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
