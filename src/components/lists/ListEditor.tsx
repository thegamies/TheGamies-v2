"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
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

const SLOT_PRESETS = [5, 10, 20, 50] as const;

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

function segmentBtnCls(active: boolean) {
  return `px-3 h-8 text-xs font-extrabold tracking-[0.12em] uppercase transition-colors ${
    active
      ? "bg-accent text-white"
      : "bg-transparent text-muted hover:text-ink"
  }`;
}

export function ListEditor({
  publicId,
  listType,
  initialTitle,
  initialYear,
  initialItems,
  error = null,
}: ListEditorProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(initialYear?.toString() ?? "");
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [slotCount, setSlotCount] = useState(() =>
    Math.max(10, initialItems.length || 10),
  );
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [saveError, setSaveError] = useState<string | null>(error);
  const [pending, startTransition] = useTransition();
  const [searchPending, startSearch] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [pendingTrim, setPendingTrim] = useState<number | null>(null);

  const isFull = items.length >= slotCount;
  const selectedIds = new Set(items.map((i) => i.gameId));
  const visibleHits = hits.filter((hit) => !selectedIds.has(hit.id));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const yearNum = year ? Number(year) : undefined;
        const next = await searchGamesForList({
          q: query,
          year: listType === "goty" ? yearNum : undefined,
          gotyMode: listType === "goty",
        });
        setHits(next);
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, year, listType]);

  useEffect(() => {
    if (!settingsOpen) return;
    function onPointer(e: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setSlotPickerOpen(false);
        setPanelOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  function focusSearch() {
    setPanelOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 50);
  }

  function itemsJson() {
    return JSON.stringify(
      items.map((item, index) => ({
        gameId: item.gameId,
        rank: index + 1,
      })),
    );
  }

  function applySlotCount(next: number) {
    const clamped = Math.min(LIST_MAX_ITEMS, Math.max(1, next));
    if (clamped < items.length) {
      setItems((prev) =>
        prev.slice(0, clamped).map((item, i) => ({ ...item, rank: i + 1 })),
      );
    }
    setSlotCount(clamped);
    setPendingTrim(null);
    setSlotPickerOpen(false);
  }

  function changeSlotCount(next: number) {
    const clamped = Math.min(LIST_MAX_ITEMS, Math.max(1, next));
    if (clamped < items.length) {
      setPendingTrim(clamped);
      return;
    }
    applySlotCount(clamped);
  }

  function addGame(hit: GameSearchHit) {
    if (items.some((i) => i.gameId === hit.id)) return;
    if (items.length >= slotCount) {
      if (slotCount >= LIST_MAX_ITEMS) {
        setSaveError(`Lists can hold at most ${LIST_MAX_ITEMS} games.`);
        return;
      }
      setSlotCount((n) => Math.min(LIST_MAX_ITEMS, Math.max(n, items.length + 1)));
    }
    setItems((prev) => {
      if (prev.length >= LIST_MAX_ITEMS) return prev;
      return [
        ...prev,
        {
          gameId: hit.id,
          slug: hit.slug,
          title: hit.title,
          year: hit.year,
          coverUrl: hit.coverUrl,
          rank: prev.length + 1,
        },
      ];
    });
    setQuery("");
    setSaveError(null);
    setPanelOpen(false);
  }

  function removeAt(index: number) {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, rank: i + 1 })),
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

  const emptySlots = Math.max(0, slotCount - items.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-line pb-4">
        <label className="min-w-[12rem] flex-1 text-sm tracking-wide text-muted">
          Title
          <input
            value={title}
            readOnly={listType === "goty"}
            onChange={(e) => {
              if (listType === "goty") return;
              setTitle(e.target.value);
            }}
            className={`mt-1 w-full border-b border-line bg-transparent py-1.5 text-lg outline-none ${
              listType === "goty"
                ? "cursor-default text-muted"
                : "text-ink focus:border-accent"
            }`}
          />
        </label>

        <div className="text-sm tracking-wide text-muted">
          Size
          <div className="mt-1 flex items-center overflow-hidden border border-line">
            <button
              type="button"
              onClick={() => changeSlotCount(slotCount - 1)}
              disabled={slotCount <= 1}
              aria-label="Fewer slots"
              className="grid h-8 w-8 place-items-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setSlotPickerOpen(true)}
              aria-haspopup="dialog"
              aria-label={`List size: ${slotCount}. Tap to pick.`}
              className="flex h-8 w-14 items-center justify-center gap-1 border-x border-line text-sm font-semibold text-ink transition-colors hover:text-accent"
            >
              {slotCount}
              <span className="text-muted">▾</span>
            </button>
            <button
              type="button"
              onClick={() => changeSlotCount(slotCount + 1)}
              disabled={slotCount >= LIST_MAX_ITEMS}
              aria-label="More slots"
              className="grid h-8 w-8 place-items-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        <div ref={settingsRef} className="relative self-end">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            aria-label="List settings"
            className={`grid h-8 w-8 place-items-center border text-sm transition-colors ${
              settingsOpen
                ? "border-accent text-accent"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            ⚙
          </button>
          {settingsOpen ? (
            <div
              role="dialog"
              aria-label="List settings"
              className="absolute top-full left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-4 border border-line bg-panel p-3"
            >
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                  List type
                </p>
                <div
                  role="group"
                  aria-label="List type"
                  className="flex overflow-hidden border border-line"
                >
                  <Link
                    href={`/create/goty?id=${publicId}`}
                    className={`flex-1 text-center ${segmentBtnCls(listType === "goty")}`}
                  >
                    GOTY
                  </Link>
                  <Link
                    href={`/create/custom?id=${publicId}`}
                    className={`flex-1 text-center ${segmentBtnCls(listType === "custom")}`}
                  >
                    Custom
                  </Link>
                </div>
                {listType === "goty" ? (
                  <label className="mt-2 block text-sm tracking-wide text-muted">
                    Year
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="mt-1 block w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 self-end">
          <Button
            type="button"
            variant="bordered"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <form action={publishListAction}>
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="listType" value={listType} />
            <input type="hidden" name="itemsJson" value={itemsJson()} />
            <input type="hidden" name="title" value={title} />
            {year ? <input type="hidden" name="year" value={year} /> : null}
            <Button type="submit" disabled={items.length === 0}>
              Publish
            </Button>
          </form>
          <form action={resetDraftAction}>
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="listType" value={listType} />
            <Button type="submit" variant="quiet">
              Reset
            </Button>
          </form>
        </div>

        {saveError ? (
          <p className="w-full text-sm text-accent" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-16 lg:block lg:self-start">
          <SearchGamesPanelBody
            searchRef={searchRef}
            query={query}
            onQueryChange={setQuery}
            isFull={isFull}
            fullMessage={`All ${slotCount} slots filled. Increase size or remove a game to add more.`}
            searching={searchPending}
            visibleResults={visibleHits}
            resultsEmpty={hits.length === 0}
            onAdd={addGame}
          />
        </aside>

        <section className="min-w-0">
          {items.length === 0 ? (
            <button
              type="button"
              onClick={focusSearch}
              className="w-full border border-dashed border-line px-4 py-10 text-left text-muted transition-colors hover:border-accent hover:text-ink"
            >
              Search and add games to build your ranking.
            </button>
          ) : (
            <ol className="space-y-3">
              {items.map((item, index) => (
                <li
                  key={item.gameId}
                  className="flex items-stretch border border-line bg-panel"
                >
                  <div className="flex w-10 shrink-0 items-start justify-center pt-2">
                    <RankMarker rank={index + 1} size="sm" />
                  </div>
                  <div className="h-28 w-[5.25rem] shrink-0 self-start">
                    <GameCover title={item.title} imageUrl={item.coverUrl} />
                  </div>
                  <div className="flex min-h-28 min-w-0 flex-1 flex-col justify-between gap-2 p-2 pr-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight text-ink">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted">
                          {item.year ?? "TBA"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(index)}
                        className="shrink-0 px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-accent"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                        className="px-2 py-1 text-xs text-muted hover:text-ink disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1}
                        aria-label="Move down"
                        className="px-2 py-1 text-xs text-muted hover:text-ink disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {emptySlots > 0 ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
                <button
                  key={`empty-${i}`}
                  type="button"
                  onClick={focusSearch}
                  className="flex w-full items-center gap-3 border border-dashed border-line px-3 py-4 text-left text-sm text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  <span className="font-display text-lg text-accent/50">
                    {items.length + i + 1}
                  </span>
                  Empty slot — add a game
                </button>
              ))}
              {emptySlots > 3 ? (
                <p className="text-xs text-muted">
                  +{emptySlots - 3} more empty slots
                </p>
              ) : null}
            </div>
          ) : null}

          {!isFull ? (
            <button
              type="button"
              onClick={focusSearch}
              className="mt-3 text-xs font-extrabold uppercase tracking-[0.14em] text-accent transition-opacity hover:opacity-80"
            >
              + Add game
            </button>
          ) : null}

          <p className="mt-4 text-xs text-muted">
            {items.length} of {slotCount} slots
            {slotCount < LIST_MAX_ITEMS
              ? ` · capacity up to ${LIST_MAX_ITEMS}`
              : null}
          </p>
        </section>
      </div>

      {panelOpen ? (
        <aside className="fixed inset-x-0 top-0 bottom-14 z-40 flex flex-col bg-paper lg:hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-3">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-ink">
              Search games
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              className="p-1 text-muted transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <SearchGamesPanelBody
              searchRef={searchRef}
              query={query}
              onQueryChange={setQuery}
              isFull={isFull}
              fullMessage={`All ${slotCount} slots filled. Increase size or remove a game to add more.`}
              searching={searchPending}
              visibleResults={visibleHits}
              resultsEmpty={hits.length === 0}
              onAdd={addGame}
            />
          </div>
        </aside>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 border-t border-line bg-panel lg:hidden">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-pressed={panelOpen}
          className={`flex-1 px-4 text-xs font-extrabold uppercase tracking-[0.16em] transition-colors ${
            panelOpen ? "text-accent" : "text-muted"
          }`}
        >
          Search games
        </button>
      </nav>

      <SlotPickerDialog
        open={slotPickerOpen}
        value={slotCount}
        max={LIST_MAX_ITEMS}
        itemsCount={items.length}
        onPick={changeSlotCount}
        onClose={() => setSlotPickerOpen(false)}
      />

      {pendingTrim != null ? (
        <ConfirmDialog
          open
          title="Shrink list?"
          message={`Shrinking to ${pendingTrim} removes ${items.length - pendingTrim} ${
            items.length - pendingTrim === 1 ? "game" : "games"
          } from the bottom of your ranking.`}
          confirmLabel="Shrink anyway"
          onCancel={() => setPendingTrim(null)}
          onConfirm={() => applySlotCount(pendingTrim)}
        />
      ) : null}
    </div>
  );
}

function SearchGamesPanelBody({
  searchRef,
  query,
  onQueryChange,
  isFull,
  fullMessage,
  searching,
  visibleResults,
  resultsEmpty,
  onAdd,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (value: string) => void;
  isFull: boolean;
  fullMessage: string;
  searching: boolean;
  visibleResults: GameSearchHit[];
  resultsEmpty: boolean;
  onAdd: (game: GameSearchHit) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        ref={searchRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search games…"
        aria-label="Search games"
        className="min-w-0 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
      />
      {isFull ? (
        <p className="shrink-0 text-xs text-accent">{fullMessage}</p>
      ) : null}
      <div className="max-h-[32rem] overflow-y-auto border border-line bg-panel p-2">
        {searching ? (
          <p className="px-2 py-4 text-sm text-muted">Searching…</p>
        ) : visibleResults.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">
            {resultsEmpty
              ? "No games found yet."
              : "Every result is already in your list."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {visibleResults.map((game) => (
              <button
                key={game.id}
                type="button"
                disabled={isFull}
                onClick={() => onAdd(game)}
                title={game.title}
                className="group flex flex-col gap-1 text-left disabled:opacity-40"
              >
                <div className="aspect-[3/4] w-full overflow-hidden ring-1 ring-transparent transition group-hover:ring-2 group-hover:ring-accent">
                  <GameCover title={game.title} imageUrl={game.coverUrl} />
                </div>
                <span className="line-clamp-2 text-xs leading-tight text-ink">
                  {game.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotPickerDialog({
  open,
  value,
  max,
  itemsCount,
  onPick,
  onClose,
}: {
  open: boolean;
  value: number;
  max: number;
  itemsCount: number;
  onPick: (n: number) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  if (!open) return null;
  const presets = SLOT_PRESETS.filter((n) => n <= max);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-sm border border-line bg-panel"
      >
        <div className="border-b border-line px-4 py-3">
          <p
            id={titleId}
            className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted"
          >
            List size
          </p>
          <p className="mt-1 text-sm text-ink">
            Current {value}
            {itemsCount > 0 ? ` · ${itemsCount} filled` : null}
          </p>
        </div>
        {presets.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 border-b border-line px-4 py-3">
            {presets.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onPick(n);
                  onClose();
                }}
                className={`h-10 border text-sm font-semibold ${
                  n === value
                    ? "border-accent bg-accent text-white"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
        <div className="max-h-48 overflow-y-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onPick(n);
                  onClose();
                }}
                className={`h-8 text-xs ${
                  n === value
                    ? "bg-accent text-white"
                    : n <= itemsCount
                      ? "text-ink"
                      : "text-muted hover:text-ink"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md border border-line bg-panel p-5"
      >
        <p className="font-display text-2xl tracking-wide text-ink">{title}</p>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
