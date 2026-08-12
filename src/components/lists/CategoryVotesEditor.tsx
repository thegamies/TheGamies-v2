"use client";

import { useState, useTransition } from "react";
import {
  searchGamesForList,
  type GameSearchHit,
} from "@/app/create/search-actions";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";

export type AwardCategoryOption = {
  id: string;
  label: string;
  description: string | null;
};

export type CategoryVoteSelection = {
  categoryId: string;
  gameId: string;
  title: string;
  coverUrl: string | null;
};

type Props = {
  categories: AwardCategoryOption[];
  value: CategoryVoteSelection[];
  onChange: (next: CategoryVoteSelection[]) => void;
  /** GOTY year — category search is restricted to this year. */
  year: number;
};

export function CategoryVotesEditor({
  categories,
  value,
  onChange,
  year,
}: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [pending, startTransition] = useTransition();

  function setSearchQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    const q = next.trim();
    startTransition(async () => {
      const results = await searchGamesForList({
        q,
        year,
        gotyMode: true,
      });
      setHits(results);
    });
  }

  function pick(hit: GameSearchHit) {
    if (!activeCategoryId) return;
    const without = value.filter((v) => v.categoryId !== activeCategoryId);
    onChange([
      ...without,
      {
        categoryId: activeCategoryId,
        gameId: hit.id,
        title: hit.title,
        coverUrl: hit.coverUrl,
      },
    ]);
    setQuery("");
    setHits([]);
  }

  function clear(categoryId: string) {
    onChange(value.filter((v) => v.categoryId !== categoryId));
  }

  if (categories.length === 0) return null;

  return (
    <section className="border-t border-line pt-8">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        Categories
      </p>
      <h2 className="mt-2 font-display text-3xl tracking-wide text-ink">
        Award picks
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Choose one game per category. These feed the site live category
        standings.
      </p>

      <div className="mt-6 grid gap-4">
        {categories.map((cat) => {
          const selected = value.find((v) => v.categoryId === cat.id);
          const open = activeCategoryId === cat.id;
          return (
            <div key={cat.id} className="border-b border-line pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{cat.label}</p>
                  {cat.description ? (
                    <p className="mt-2 text-sm text-muted">{cat.description}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  className="px-0 py-0"
                  onClick={() =>
                    setActiveCategoryId(open ? null : cat.id)
                  }
                >
                  {open ? "Close" : selected ? "Change" : "Pick"}
                </Button>
              </div>

              {selected ? (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-10 shrink-0">
                    <GameCover
                      title={selected.title}
                      imageUrl={selected.coverUrl}
                    />
                  </div>
                  <p className="min-w-0 flex-1 text-sm text-ink">
                    {selected.title}
                  </p>
                  <Button
                    type="button"
                    variant="quiet"
                    className="px-0 py-0"
                    onClick={() => clear(cat.id)}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">No pick yet.</p>
              )}

              {open ? (
                <div className="mt-3">
                  <input
                    className={fieldInputClass}
                    value={query}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${year} games`}
                    aria-label={`Search ${year} games for ${cat.label}`}
                  />
                  {pending ? (
                    <p className="mt-2 text-xs text-muted">Searching…</p>
                  ) : null}
                  {hits.length > 0 ? (
                    <ul className="mt-2 max-h-48 overflow-auto border border-line">
                      {hits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-panel"
                            onClick={() => pick(hit)}
                          >
                            <div className="w-8 shrink-0">
                              <GameCover
                                title={hit.title}
                                imageUrl={hit.coverUrl}
                              />
                            </div>
                            <span>{hit.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
