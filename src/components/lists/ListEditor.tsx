"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  saveOwnedListAction,
  shareListAction,
} from "@/app/create/actions";
import {
  searchGamesForList,
  type GameSearchHit,
} from "@/app/create/search-actions";
import { ListExportDialog } from "@/components/list-export/ListExportDialog";
import {
  EXPORT_RANK_STYLES,
  type ExportRankFormat,
  type ExportRankStyle,
} from "@/components/list-export/rankChrome";
import { PosterBuilder } from "@/components/lists/PosterBuilder";
import { Button } from "@/components/ui/Button";
import {
  controlGroupClass,
  controlGroupFullClass,
  controlLabelClass,
  fieldInputClass,
  iconControlClass,
  segmentBtnClass,
  stepperBtnClass,
  stepperValueClass,
} from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import {
  buildListDraftPayload,
  writeListDraftCookieClient,
} from "@/lib/lists/draft-cookie";
import { LIST_MAX_ITEMS } from "@/lib/lists/schema";

const SLOT_PRESETS = [5, 10, 20, 50] as const;

export type EditorItem = {
  gameId: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  rank: number;
  blurb: string;
};

type ListFormat = "poster" | "list";

type ListEditorProps = {
  publicId?: string | null;
  listType: "goty" | "custom";
  initialTitle: string;
  initialYear: number | null;
  initialItems: EditorItem[];
  initialSlotCount?: number;
  initialListFormat?: ListFormat;
  initialRankStyle?: ExportRankStyle;
  initialShowSuffix?: boolean;
  signedIn?: boolean;
  error?: string | null;
};

function withRanks(items: EditorItem[]): EditorItem[] {
  return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

function formatTitleList(names: string[]): string {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

export function ListEditor({
  publicId: initialPublicId = null,
  listType: initialListType,
  initialTitle,
  initialYear,
  initialItems,
  initialSlotCount,
  initialListFormat = "poster",
  initialRankStyle = "chip",
  initialShowSuffix = false,
  signedIn = false,
  error = null,
}: ListEditorProps) {
  const pathname = usePathname();
  const currentYear = new Date().getUTCFullYear();
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const committedYearRef = useRef(initialYear ?? currentYear);

  const [publicId, setPublicId] = useState<string | null>(
    initialPublicId ?? null,
  );
  const [listType, setListType] = useState<"goty" | "custom">(initialListType);
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(
    (initialYear ?? currentYear).toString(),
  );
  const [draftYear, setDraftYear] = useState(initialYear ?? currentYear);
  const [items, setItems] = useState<EditorItem[]>(() =>
    withRanks(
      initialItems.map((item) => ({
        ...item,
        blurb: item.blurb ?? "",
      })),
    ),
  );
  const [slotCount, setSlotCount] = useState(() =>
    Math.max(initialSlotCount ?? 10, initialItems.length),
  );
  const [listFormat, setListFormat] = useState<ListFormat>(initialListFormat);
  const [rankStyle, setRankStyle] =
    useState<ExportRankStyle>(initialRankStyle);
  const [showSuffix, setShowSuffix] = useState(initialShowSuffix);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [saveError, setSaveError] = useState<string | null>(error);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searchPending, startSearch] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingTrim, setPendingTrim] = useState<number | null>(null);
  const [pendingYearTrim, setPendingYearTrim] = useState<{
    year: number;
    listType: "goty" | "custom";
  } | null>(null);

  const yearNum = Number(year) || currentYear;
  const rankFormat: ExportRankFormat = showSuffix ? "ordinal" : "number";
  const showYearBadge = listType === "goty";
  const showTopCount = listType === "custom";
  const isFull = items.length >= slotCount;
  const selectedIds = new Set(items.map((i) => i.gameId));
  const visibleHits = hits.filter((hit) => !selectedIds.has(hit.id));
  const emptySlots = Math.max(0, slotCount - items.length);
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const next = await searchGamesForList({
          q: query,
          year: listType === "goty" ? yearNum : undefined,
          gotyMode: listType === "goty",
        });
        setHits(next);
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, yearNum, listType]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const payload = buildListDraftPayload({
        listType,
        year: listType === "goty" ? yearNum : year ? yearNum : null,
        title,
        igdbIds: items.map((item) => item.igdbId),
        slotCount,
        listFormat,
        rankStyle,
        showSuffix,
        publicId,
      });
      writeListDraftCookieClient(payload);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [
    listType,
    year,
    yearNum,
    title,
    items,
    slotCount,
    listFormat,
    rankStyle,
    showSuffix,
    publicId,
  ]);

  const requestYearTrim = useCallback(
    (targetYear: number, nextListType: "goty" | "custom") => {
      if (!Number.isFinite(targetYear)) return;
      const y = Math.floor(targetYear);

      if (nextListType !== "goty") {
        setYear(String(y));
        setDraftYear(y);
        setListType(nextListType);
        committedYearRef.current = y;
        setPendingYearTrim(null);
        return;
      }

      setItems((prev) => {
        const disallowed = prev.filter((item) => item.year !== y);
        if (disallowed.length === 0) {
          setYear(String(y));
          setDraftYear(y);
          setListType(nextListType);
          committedYearRef.current = y;
          setTitle(`${y} Game of the Year`);
          setPendingYearTrim(null);
          return prev;
        }
        setPendingYearTrim({ year: y, listType: nextListType });
        return prev;
      });
    },
    [],
  );

  useEffect(() => {
    if (!settingsOpen) return;
    function onPointer(e: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
        if (listType === "goty") {
          requestYearTrim(draftYear, "goty");
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setSlotPickerOpen(false);
        setPanelOpen(false);
        if (listType === "goty") {
          requestYearTrim(draftYear, "goty");
        }
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen, listType, draftYear, requestYearTrim]);

  function focusSearch() {
    setPanelOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 50);
  }

  function draftJson(includeBlurbs: boolean) {
    return JSON.stringify({
      publicId,
      listType,
      title,
      year: listType === "goty" ? yearNum : year ? yearNum : null,
      items: items.map((item, index) => ({
        igdbId: item.igdbId,
        rank: index + 1,
        blurb: includeBlurbs ? item.blurb : null,
      })),
    });
  }

  function applySlotCount(next: number) {
    const clamped = Math.min(LIST_MAX_ITEMS, Math.max(1, next));
    if (clamped < items.length) {
      setItems((prev) => withRanks(prev.slice(0, clamped)));
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

  function applyYearTrim(targetYear: number, nextListType: "goty" | "custom") {
    setYear(String(targetYear));
    setDraftYear(targetYear);
    setListType(nextListType);
    committedYearRef.current = targetYear;
    if (nextListType === "goty") {
      setTitle(`${targetYear} Game of the Year`);
      setItems((prev) =>
        withRanks(prev.filter((item) => item.year === targetYear)),
      );
    }
    setPendingYearTrim(null);
  }

  function openSettings() {
    setDraftYear(Number(year) || currentYear);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    if (listType === "goty") {
      requestYearTrim(draftYear, "goty");
    }
  }

  function setListTypeChoice(next: "goty" | "custom") {
    if (next === listType) return;
    if (next === "custom") {
      setListType("custom");
      setPendingYearTrim(null);
      return;
    }
    requestYearTrim(draftYear || yearNum, "goty");
  }

  function addGame(hit: GameSearchHit) {
    if (items.some((i) => i.gameId === hit.id)) return;
    if (listType === "goty" && hit.year !== yearNum) return;
    if (items.length >= slotCount) {
      if (slotCount >= LIST_MAX_ITEMS) {
        setSaveError(`Lists can hold at most ${LIST_MAX_ITEMS} games.`);
        return;
      }
      setSlotCount((n) =>
        Math.min(LIST_MAX_ITEMS, Math.max(n, items.length + 1)),
      );
    }
    setItems((prev) => {
      if (prev.length >= LIST_MAX_ITEMS) return prev;
      return withRanks([
        ...prev,
        {
          gameId: hit.id,
          igdbId: hit.igdbId,
          slug: hit.slug,
          title: hit.title,
          year: hit.year,
          coverUrl: hit.coverUrl,
          rank: prev.length + 1,
          blurb: "",
        },
      ]);
    });
    setQuery("");
    setSaveError(null);
    setPanelOpen(false);
  }

  function removeGame(id: string) {
    setItems((prev) => withRanks(prev.filter((item) => item.gameId !== id)));
  }

  function setBlurb(id: string, blurb: string) {
    if (!signedIn) return;
    setItems((prev) =>
      prev.map((item) => (item.gameId === id ? { ...item, blurb } : item)),
    );
  }

  function reorder(ids: string[]) {
    setItems((prev) => {
      const byId = new Map(prev.map((item) => [item.gameId, item]));
      return withRanks(
        ids
          .map((id) => byId.get(id))
          .filter((item): item is EditorItem => Boolean(item)),
      );
    });
  }

  const notesSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onNotesDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.gameId === active.id);
      const newIndex = prev.findIndex((item) => item.gameId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return withRanks(arrayMove(prev, oldIndex, newIndex));
    });
  }

  function save() {
    if (!signedIn) {
      setSaveNotice(
        "Sign in to save this list to your account. Your ranking is already kept on this device.",
      );
      setSavedFlash(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("draftJson", draftJson(true));
      const result = await saveOwnedListAction(null, fd);
      if (result.error) {
        setSaveError(result.error);
        setSavedFlash(false);
        return;
      }
      if (result.publicId) setPublicId(result.publicId);
      setSaveError(null);
      setSaveNotice(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  const trimMessage = (() => {
    if (pendingTrim == null) return "";
    const removed = items.slice(pendingTrim);
    const noted = removed.filter((item) => item.blurb.trim().length > 0);
    const count = removed.length;
    const base = `Shrinking to ${pendingTrim} removes ${count} ${
      count === 1 ? "game" : "games"
    } from the bottom of your ranking.`;
    if (noted.length === 0) return base;
    return `${base} Notes on ${formatTitleList(noted.map((n) => n.title))} will be lost.`;
  })();

  const yearTrimMessage = (() => {
    if (pendingYearTrim == null) return "";
    const dropped = items.filter((item) => item.year !== pendingYearTrim.year);
    const noted = dropped.filter((item) => item.blurb.trim().length > 0);
    const names = formatTitleList(dropped.map((d) => d.title));
    const typeSwitch = pendingYearTrim.listType !== listType;
    const lead = typeSwitch
      ? `Switching to GOTY ${pendingYearTrim.year}`
      : `Changing the year to ${pendingYearTrim.year}`;
    const base = `${lead} removes ${
      dropped.length === 1 ? "a game" : `${dropped.length} games`
    } (${names}).`;
    if (noted.length === 0) return base;
    return `${base} Notes on those games will be lost.`;
  })();

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-line pb-4">
        <label className={`min-w-[12rem] flex-1 ${controlLabelClass}`}>
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

        <div className={controlLabelClass}>
          Size
          <div className={controlGroupClass}>
            <button
              type="button"
              onClick={() => changeSlotCount(slotCount - 1)}
              disabled={slotCount <= 1}
              aria-label="Fewer slots"
              className={stepperBtnClass}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setSlotPickerOpen(true)}
              aria-haspopup="dialog"
              aria-label={`List size: ${slotCount}. Tap to pick.`}
              className={stepperValueClass}
            >
              {slotCount}
              <span className="text-muted">▾</span>
            </button>
            <button
              type="button"
              onClick={() => changeSlotCount(slotCount + 1)}
              disabled={slotCount >= LIST_MAX_ITEMS}
              aria-label="More slots"
              className={stepperBtnClass}
            >
              +
            </button>
          </div>
        </div>

        <div className={controlLabelClass}>
          Format
          <div
            role="group"
            aria-label="List format"
            className={controlGroupClass}
          >
            <button
              type="button"
              onClick={() => setListFormat("poster")}
              aria-pressed={listFormat === "poster"}
              className={segmentBtnClass(listFormat === "poster")}
            >
              Poster
            </button>
            <button
              type="button"
              onClick={() => setListFormat("list")}
              aria-pressed={listFormat === "list"}
              className={segmentBtnClass(listFormat === "list")}
            >
              List
            </button>
          </div>
        </div>

        <div ref={settingsRef} className="relative self-end">
          <button
            type="button"
            onClick={() => {
              if (settingsOpen) closeSettings();
              else openSettings();
            }}
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            aria-label="List settings"
            className={iconControlClass(settingsOpen)}
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
                <p className={controlLabelClass}>List type</p>
                <div
                  role="group"
                  aria-label="List type"
                  className={controlGroupFullClass}
                >
                  <button
                    type="button"
                    onClick={() => setListTypeChoice("goty")}
                    aria-pressed={listType === "goty"}
                    className={segmentBtnClass(listType === "goty")}
                  >
                    GOTY
                  </button>
                  <button
                    type="button"
                    onClick={() => setListTypeChoice("custom")}
                    aria-pressed={listType === "custom"}
                    className={segmentBtnClass(listType === "custom")}
                  >
                    Custom
                  </button>
                </div>
                {listType === "goty" ? (
                  <label className={`mt-2 block ${controlLabelClass}`}>
                    Year
                    <input
                      type="number"
                      value={Number.isFinite(draftYear) ? draftYear : ""}
                      onChange={(e) => setDraftYear(Number(e.target.value))}
                      onBlur={() => requestYearTrim(draftYear, "goty")}
                      className={fieldInputClass}
                    />
                  </label>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className={controlLabelClass}>Rank style</p>
                <div className="flex w-full flex-col gap-2">
                  <div
                    role="group"
                    aria-label="Rank style"
                    className={controlGroupFullClass}
                  >
                    {EXPORT_RANK_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setRankStyle(style.id)}
                        aria-pressed={rankStyle === style.id}
                        className={segmentBtnClass(rankStyle === style.id)}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                  {rankStyle !== "off" ? (
                    <div className={controlGroupFullClass}>
                      <button
                        type="button"
                        onClick={() => setShowSuffix((s) => !s)}
                        aria-pressed={showSuffix}
                        title="Toggle ordinal suffix (1st vs 1)"
                        className={segmentBtnClass(showSuffix)}
                      >
                        {showSuffix ? "Suffix on" : "Suffix off"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 self-end">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : savedFlash ? "Saved" : "Save"}
          </Button>
          <form action={shareListAction}>
            <input
              type="hidden"
              name="draftJson"
              value={draftJson(signedIn)}
            />
            <Button type="submit" size="sm" disabled={items.length === 0}>
              Share
            </Button>
          </form>
          <Button
            type="button"
            variant="bordered"
            size="sm"
            onClick={() => setExportOpen(true)}
            disabled={items.length === 0}
          >
            Export
          </Button>
        </div>

        {saveNotice ? (
          <p className="w-full text-sm text-muted" role="status">
            {saveNotice}{" "}
            <Link href={signInHref} className="text-accent underline">
              Sign in
            </Link>
          </p>
        ) : null}

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
          {listFormat === "poster" ? (
            <>
              <PosterBuilder
                items={items.map((item) => ({
                  id: item.gameId,
                  title: item.title,
                  coverUrl: item.coverUrl,
                }))}
                slotCount={slotCount}
                year={yearNum}
                title={title}
                listType={listType}
                rankStyle={rankStyle}
                rankFormat={rankFormat}
                showYearBadge={showYearBadge}
                showTopCount={showTopCount}
                onReorder={reorder}
                onRemove={removeGame}
                onPickEmpty={focusSearch}
              />
              <p className="mt-2 text-center text-xs text-muted">
                {items.length === 0
                  ? "Tap an empty slot or search to add games."
                  : "Drag cards to reorder. Tap an empty slot to add more."}
              </p>
            </>
          ) : (
            <>
              {items.length === 0 ? (
                <button
                  type="button"
                  onClick={focusSearch}
                  className="w-full border border-dashed border-line px-4 py-10 text-left text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  Search and add games to build your ranking.
                  {signedIn
                    ? " Notes show on the share page."
                    : " Sign in to add notes."}
                </button>
              ) : (
                <DndContext
                  sensors={notesSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onNotesDragEnd}
                >
                  <SortableContext
                    items={items.map((item) => item.gameId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ol className="space-y-3">
                      {items.map((item, index) => (
                        <NotesCard
                          key={item.gameId}
                          item={item}
                          rank={index + 1}
                          canEditNotes={signedIn}
                          signInHref={signInHref}
                          onBlurbChange={setBlurb}
                          onRemove={removeGame}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DndContext>
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
            </>
          )}
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

      <ListExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        games={items.map((item) => ({
          id: item.gameId,
          title: item.title,
          imageUrl: item.coverUrl,
        }))}
        year={yearNum}
        title={title}
        listType={listType}
        rankStyle={rankStyle}
        rankFormat={rankFormat}
        showYearBadge={showYearBadge}
        showTopCount={showTopCount}
      />

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
          message={trimMessage}
          confirmLabel="Shrink anyway"
          onCancel={() => setPendingTrim(null)}
          onConfirm={() => applySlotCount(pendingTrim)}
        />
      ) : null}

      {pendingYearTrim != null ? (
        <ConfirmDialog
          open
          title="Remove games?"
          message={yearTrimMessage}
          confirmLabel="Remove anyway"
          onCancel={() => {
            setYear(String(committedYearRef.current));
            setDraftYear(committedYearRef.current);
            setPendingYearTrim(null);
          }}
          onConfirm={() => {
            applyYearTrim(pendingYearTrim.year, pendingYearTrim.listType);
          }}
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
        className="min-w-0 w-full border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors duration-[var(--motion-fast)] focus:border-accent rounded-[var(--radius-control)]"
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

function NotesCard({
  item,
  rank,
  canEditNotes,
  signInHref,
  onBlurbChange,
  onRemove,
}: {
  item: EditorItem;
  rank: number;
  canEditNotes: boolean;
  signInHref: string;
  onBlurbChange: (id: string, blurb: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.gameId });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch border border-line bg-panel ${
        isDragging ? "z-10 opacity-90 shadow-lg" : ""
      }`}
    >
      <div className="flex w-10 shrink-0 items-start justify-center pt-2">
        <RankMarker rank={rank} size="sm" />
      </div>
      <div className="h-28 w-[5.25rem] shrink-0 self-start">
        <GameCover title={item.title} imageUrl={item.coverUrl} />
      </div>
      <div className="flex min-h-28 min-w-0 flex-1 flex-col gap-1.5 p-2 pr-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-ink">
              {item.title}
            </p>
            <p className="text-xs text-muted">{item.year ?? "TBA"}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.gameId)}
            className="shrink-0 px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-accent"
          >
            Remove
          </button>
        </div>
        {canEditNotes ? (
          <textarea
            value={item.blurb}
            onChange={(e) => onBlurbChange(item.gameId, e.target.value)}
            placeholder="Optional note / review"
            rows={2}
            className="min-h-0 w-full flex-1 resize-y border border-line bg-paper px-2 py-1.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        ) : (
          <p className="text-xs text-muted">
            <Link href={signInHref} className="text-accent underline">
              Sign in
            </Link>{" "}
            to add notes.
          </p>
        )}
      </div>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.title}`}
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center border-l border-line text-muted transition-colors hover:bg-paper hover:text-ink active:cursor-grabbing"
      >
        ⠿
      </button>
    </li>
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
                className={`inline-flex h-9 items-center justify-center border rounded-[var(--radius-control)] text-xs font-semibold tracking-wide transition-colors ${
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
          <Button type="button" variant="bordered" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
