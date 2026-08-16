"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
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
  completeListAuthIntentAction,
  saveOwnedListAction,
  shareListAction,
  syncSharedListAction,
  hydrateDraftGamesAction,
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
import { GridListBuilder } from "@/components/lists/GridListBuilder";
import {
  cardRemoveButtonClassName,
} from "@/components/lists/cardChrome";
import { SaveSignInDialog } from "@/components/lists/SaveSignInDialog";
import { ShareLinkSignInDialog } from "@/components/lists/ShareLinkSignInDialog";
import { ShareMenuDialog } from "@/components/lists/ShareMenuDialog";
import { Button } from "@/components/ui/Button";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import {
  controlGroupClass,
  controlGroupFullClass,
  controlLabelClass,
  iconControlClass,
  segmentBtnClass,
  stepperBtnClass,
  stepperValueClass,
} from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import { navItemClass } from "@/components/ui/navLevels";
import {
  buildListDraftPayload,
  draftMatchesEditor,
  readListDraftClient,
  writeListDraftCookieClient,
} from "@/lib/lists/draft-cookie";
import {
  CategoryVotesEditor,
  type AwardCategoryOption,
  type CategoryVoteSelection,
} from "@/components/lists/CategoryVotesEditor";
import {
  buildListSignInHref,
  type ListAuthIntent,
} from "@/lib/lists/auth-intent";
import { LIST_BLURB_MAX, LIST_MAX_ITEMS } from "@/lib/lists/schema";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

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

type ListFormat = "poster" | "list" | "grid";

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
  /** Complete Save/Share after returning from /auth/sign-in. */
  authIntent?: ListAuthIntent | null;
  /** Path to return to after sign-in (include year/title query; no intent). */
  returnPath?: string;
  awardCategories?: AwardCategoryOption[];
  initialCategoryVotes?: CategoryVoteSelection[];
};

function withRanks(items: EditorItem[]): EditorItem[] {
  return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

function formatTitleList(names: string[]): string {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function persistSnapshot(input: {
  listType: "goty" | "custom";
  title: string;
  year: string;
  items: EditorItem[];
  categoryVotes: CategoryVoteSelection[];
  listFormat: ListFormat;
  slotCount: number;
  rankStyle: ExportRankStyle;
  showSuffix: boolean;
}): string {
  return JSON.stringify({
    listType: input.listType,
    title: input.title,
    year: input.year,
    listFormat: input.listFormat,
    slotCount: input.slotCount,
    rankStyle: input.rankStyle,
    showSuffix: input.showSuffix,
    items: input.items.map((item, index) => ({
      igdbId: item.igdbId,
      gameId: item.gameId,
      rank: index + 1,
      blurb: item.blurb,
    })),
    categoryVotes: input.categoryVotes.map((v) => ({
      categoryId: v.categoryId,
      gameId: v.gameId,
    })),
  });
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
  authIntent = null,
  returnPath: returnPathProp,
  awardCategories = [],
  initialCategoryVotes = [],
}: ListEditorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const returnPath = returnPathProp ?? pathname;
  const currentYear = new Date().getUTCFullYear();
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const shareFormRef = useRef<HTMLFormElement>(null);
  const authIntentHandled = useRef(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    persistSnapshot({
      listType: initialListType,
      title: initialTitle,
      year: (initialYear ?? new Date().getUTCFullYear()).toString(),
      items: withRanks(
        initialItems.map((item) => ({
          ...item,
          blurb: item.blurb ?? "",
        })),
      ),
      categoryVotes: initialCategoryVotes,
      listFormat: initialListFormat,
      slotCount: Math.max(initialSlotCount ?? 10, initialItems.length),
      rankStyle: initialRankStyle,
      showSuffix: initialShowSuffix,
    }),
  );

  const [publicId, setPublicId] = useState<string | null>(
    initialPublicId ?? null,
  );
  const [listType] = useState<"goty" | "custom">(initialListType);
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(
    (initialYear ?? currentYear).toString(),
  );
  const [categoryVotes, setCategoryVotes] =
    useState<CategoryVoteSelection[]>(initialCategoryVotes);
  const showCategoryTabs =
    listType === "goty" && awardCategories.length > 0;
  const [editorView, setEditorView] = useState<"goty" | "categories">("goty");
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
  const [draftReady, setDraftReady] = useState(
    () => signedIn && !authIntent,
  );
  const [pending, startTransition] = useTransition();
  const [searchPending, startSearch] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [saveSignInOpen, setSaveSignInOpen] = useState(false);
  const [shareLinkSignInOpen, setShareLinkSignInOpen] = useState(false);
  const [pendingTrim, setPendingTrim] = useState<number | null>(null);

  const yearNum = Number(year) || currentYear;
  const rankFormat: ExportRankFormat = showSuffix ? "ordinal" : "number";
  const showYearBadge = listType === "goty";
  const showTopCount = listType === "custom";
  const isFull = items.length >= slotCount;
  const selectedIds = new Set(items.map((i) => i.gameId));
  const visibleHits = hits.filter((hit) => !selectedIds.has(hit.id));
  const emptySlots = Math.max(0, slotCount - items.length);
  const signInHref = buildListSignInHref(returnPath, "save");
  const currentSnapshot = () =>
    persistSnapshot({
      listType,
      title,
      year,
      items,
      categoryVotes,
      listFormat,
      slotCount,
      rankStyle,
      showSuffix,
    });
  const dirty = signedIn && currentSnapshot() !== savedSnapshot;
  const { allowLeave, dialog: unsavedDialog } = useUnsavedChangesGuard(dirty, {
    message: "Leave without saving? Your latest edits won’t be kept on this list.",
  });
  const onGotyChrome = editorView === "goty";
  const authIntentEmptyError =
    signedIn && authIntent && draftReady && items.length === 0
      ? "Add at least one game before saving or sharing."
      : null;
  const displayError = saveError ?? authIntentEmptyError;

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

  // Restore anon draft BEFORE any cookie write — remounting an empty editor
  // used to wipe the saved draft on back/forward. Also restore once after
  // sign-in when completing Save/Share intent.
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync restore from device storage before paint */
    if (signedIn && !authIntent) {
      setDraftReady(true);
      return;
    }

    const draft = readListDraftClient();
    if (!draft || !draftMatchesEditor(draft, { listType, yearNum })) {
      setDraftReady(true);
      return;
    }
    if (draft.igdbIds.length === 0) {
      setDraftReady(true);
      return;
    }

    const draftIds = draft.igdbIds.join(",");
    const currentIds = items.map((item) => item.igdbId).join(",");
    if (currentIds === draftIds) {
      setDraftReady(true);
      return;
    }

    if (draft.games && draft.games.length > 0) {
      const byIgdb = new Map(draft.games.map((g) => [g.igdbId, g]));
      const nextItems = draft.igdbIds
        .map((id, index) => {
          const game = byIgdb.get(id);
          if (!game) return null;
          return {
            gameId: game.gameId,
            igdbId: game.igdbId,
            slug: game.slug,
            title: game.title,
            year: game.year,
            coverUrl: game.coverUrl,
            rank: index + 1,
            blurb: "",
          } satisfies EditorItem;
        })
        .filter((item): item is EditorItem => Boolean(item));
      if (nextItems.length > 0) {
        setItems(withRanks(nextItems));
        setSlotCount(Math.max(draft.slotCount, nextItems.length));
        setTitle(draft.title);
        if (draft.year != null) setYear(String(draft.year));
        if (draft.listFormat) setListFormat(draft.listFormat);
        if (draft.rankStyle) setRankStyle(draft.rankStyle);
        if (typeof draft.showSuffix === "boolean") {
          setShowSuffix(draft.showSuffix);
        }
        if (draft.publicId) setPublicId(draft.publicId);
      }
      setDraftReady(true);
      return;
    }

    let cancelled = false;
    void hydrateDraftGamesAction(draft.igdbIds).then((games) => {
      if (cancelled) return;
      const byIgdb = new Map(games.map((g) => [g.igdbId, g]));
      const nextItems = draft.igdbIds
        .map((id, index) => {
          const game = byIgdb.get(id);
          if (!game) return null;
          return {
            gameId: game.gameId,
            igdbId: game.igdbId,
            slug: game.slug,
            title: game.title,
            year: game.year,
            coverUrl: game.coverUrl,
            rank: index + 1,
            blurb: "",
          } satisfies EditorItem;
        })
        .filter((item): item is EditorItem => Boolean(item));
      if (nextItems.length === 0) {
        setDraftReady(true);
        return;
      }
      setItems(withRanks(nextItems));
      setSlotCount(Math.max(draft.slotCount, nextItems.length));
      setTitle(draft.title);
      if (draft.year != null) setYear(String(draft.year));
      if (draft.listFormat) setListFormat(draft.listFormat);
      if (draft.rankStyle) setRankStyle(draft.rankStyle);
      if (typeof draft.showSuffix === "boolean") setShowSuffix(draft.showSuffix);
      if (draft.publicId) setPublicId(draft.publicId);
      setDraftReady(true);
    });

    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only on mount / list identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, listType, yearNum, authIntent]);

  useEffect(() => {
    if (!signedIn || !authIntent || !draftReady) return;
    if (authIntentHandled.current) return;
    if (items.length === 0) return;
    authIntentHandled.current = true;
    allowLeave();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("draftJson", draftJson(true));
      fd.set("intent", authIntent);
      if (listType === "goty") {
        fd.set(
          "categoryVotesJson",
          JSON.stringify(
            categoryVotes.map((v) => ({
              categoryId: v.categoryId,
              gameId: v.gameId,
            })),
          ),
        );
      }
      const result = await completeListAuthIntentAction(fd);
      // intent=share redirects server-side
      if (result.error) {
        setSaveError(result.error);
        authIntentHandled.current = false;
        return;
      }
      if (result.publicId) {
        setPublicId(result.publicId);
        setSavedSnapshot(currentSnapshot());
        setSaveError(null);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2000);
        router.replace(`/create/${listType}?id=${encodeURIComponent(result.publicId)}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot post-auth completion
  }, [signedIn, authIntent, draftReady, items.length]);

  useEffect(() => {
    if (signedIn || !draftReady) return;

    // Never clobber a richer saved draft with an empty remount.
    if (items.length === 0) {
      const existing = readListDraftClient();
      if (
        existing &&
        existing.igdbIds.length > 0 &&
        draftMatchesEditor(existing, { listType, yearNum })
      ) {
        return;
      }
    }

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
      games: items.map((item) => ({
        gameId: item.gameId,
        igdbId: item.igdbId,
        slug: item.slug,
        title: item.title,
        year: item.year,
        coverUrl: item.coverUrl,
      })),
    });
    writeListDraftCookieClient(payload);
  }, [
    signedIn,
    draftReady,
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

  // Anon edits on an already-shared list must hit Postgres too — the share
  // page loads from the DB, not the draft cookie.
  useEffect(() => {
    if (signedIn || !publicId) return;

    function payloadJson() {
      return JSON.stringify({
        publicId,
        listType,
        title,
        year: listType === "goty" ? yearNum : year ? yearNum : null,
        items: items.map((item, index) => ({
          igdbId: item.igdbId,
          rank: index + 1,
          blurb: null,
        })),
      });
    }

    const handle = window.setTimeout(() => {
      void syncSharedListAction(payloadJson());
    }, 600);

    function flush() {
      void syncSharedListAction(payloadJson());
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(handle);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [signedIn, publicId, listType, title, year, yearNum, items]);

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

  function openSettings() {
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
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
    const next = blurb.slice(0, LIST_BLURB_MAX);
    setItems((prev) =>
      prev.map((item) => (item.gameId === id ? { ...item, blurb: next } : item)),
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

  const notesDndId = useId();
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
      setSaveSignInOpen(true);
      setSaveNotice(null);
      setSavedFlash(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("draftJson", draftJson(true));
      if (listType === "goty" && signedIn) {
        fd.set(
          "categoryVotesJson",
          JSON.stringify(
            categoryVotes.map((v) => ({
              categoryId: v.categoryId,
              gameId: v.gameId,
            })),
          ),
        );
      }
      const result = await saveOwnedListAction(null, fd);
      if (result.error) {
        setSaveError(result.error);
        setSavedFlash(false);
        return;
      }
      if (result.publicId) setPublicId(result.publicId);
      setSavedSnapshot(currentSnapshot());
      setSaveError(null);
      setSaveNotice(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function openShareMenu() {
    if (items.length === 0) return;
    setShareMenuOpen(true);
  }

  function shareWithLink() {
    if (!signedIn) {
      setShareLinkSignInOpen(true);
      return;
    }
    allowLeave();
    shareFormRef.current?.requestSubmit();
  }

  function onShareClick() {
    if (items.length === 0) return;
    if (editorView === "categories") {
      shareWithLink();
      return;
    }
    openShareMenu();
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

  return (
    <div
      className={`space-y-6 ${
        signedIn && dirty
          ? editorView === "goty"
            ? "pb-36 lg:pb-24"
            : "pb-24"
          : "pb-20 lg:pb-0"
      }`}
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
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
      </div>

      {showCategoryTabs ? (
        <div
          className="flex flex-wrap gap-5 border-b border-line pb-0"
          role="tablist"
          aria-label="List sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={editorView === "goty"}
            onClick={() => {
              setEditorView("goty");
            }}
            className={navItemClass("secondary", editorView === "goty")}
          >
            Game of the Year
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={editorView === "categories"}
            onClick={() => {
              setPanelOpen(false);
              setEditorView("categories");
            }}
            className={navItemClass("secondary", editorView === "categories")}
          >
            Categories
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-line pb-4">
        {onGotyChrome ? (
          <>
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
                <button
                  type="button"
                  onClick={() => setListFormat("grid")}
                  aria-pressed={listFormat === "grid"}
                  className={segmentBtnClass(listFormat === "grid")}
                >
                  Grid
                </button>
              </div>
            </div>
          </>
        ) : null}

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
          {!(signedIn && dirty) ? (
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={save}
              disabled={pending}
            >
              {pending ? "Saving…" : savedFlash ? "Saved" : "Save"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={items.length === 0 || pending}
            onClick={onShareClick}
          >
            Share
          </Button>
          <form
            ref={shareFormRef}
            action={shareListAction}
            className="hidden"
            onSubmit={() => {
              allowLeave();
            }}
          >
            <input
              type="hidden"
              name="draftJson"
              value={draftJson(signedIn)}
            />
          </form>
        </div>

        {saveNotice ? (
          <p className="w-full text-sm text-muted" role="status">
            {saveNotice}{" "}
            <Link href={signInHref} className="text-accent underline">
              Sign in
            </Link>
          </p>
        ) : null}

        {displayError ? (
          <p className="w-full text-sm text-accent" role="alert">
            {displayError}
          </p>
        ) : null}
      </div>

      {showCategoryTabs && editorView === "categories" ? (
        <div className="mx-auto w-full max-w-[var(--page-max)] pb-8">
          <CategoryVotesEditor
            key={yearNum}
            categories={awardCategories}
            value={categoryVotes}
            onChange={setCategoryVotes}
            year={yearNum}
            locked={!signedIn}
            lockHref={signInHref}
          />
        </div>
      ) : (
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
          ) : listFormat === "grid" ? (
              <GridListBuilder
              items={items.map((item) => ({
                id: item.gameId,
                title: item.title,
                coverUrl: item.coverUrl,
              }))}
              slotCount={slotCount}
              onReorder={reorder}
              onRemove={removeGame}
              onPickEmpty={focusSearch}
            />
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
                  id={notesDndId}
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
                  {Array.from({ length: emptySlots }).map((_, i) => (
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
      )}

      {editorView === "goty" && panelOpen ? (
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

      {editorView === "goty" ? (
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
      ) : null}

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

      <ShareMenuDialog
        open={shareMenuOpen}
        onClose={() => setShareMenuOpen(false)}
        onShareAsImage={() => setExportOpen(true)}
        onShareWithLink={shareWithLink}
      />

      <SaveSignInDialog
        open={saveSignInOpen}
        onClose={() => setSaveSignInOpen(false)}
        returnPath={returnPath}
      />

      <ShareLinkSignInDialog
        open={shareLinkSignInOpen}
        onClose={() => setShareLinkSignInOpen(false)}
        onShareAsImage={() => setExportOpen(true)}
        returnPath={returnPath}
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

      {signedIn && dirty ? (
        <PinnedSaveBar
          className={`fixed inset-x-0 z-40 ${
            editorView === "goty" ? "bottom-14 lg:bottom-0" : "bottom-0"
          }`}
          message="Unsaved changes"
        >
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={pending}
            data-testid="unsaved-changes"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </PinnedSaveBar>
      ) : null}

      {unsavedDialog}
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
  const [expanded, setExpanded] = useState(false);
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
      <div className="relative h-28 w-[5.25rem] shrink-0 self-start">
        <GameCover title={item.title} imageUrl={item.coverUrl} />
        <button
          type="button"
          onClick={() => onRemove(item.gameId)}
          aria-label={`Remove ${item.title}`}
          className={cardRemoveButtonClassName}
        >
          ✕
        </button>
      </div>
      <div className="flex min-h-28 min-w-0 flex-1 flex-col gap-1.5 p-2 pr-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight text-ink">
            {item.title}
          </p>
        </div>
        {canEditNotes ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <textarea
              value={item.blurb}
              onChange={(e) => onBlurbChange(item.gameId, e.target.value)}
              placeholder="Optional note / review"
              rows={expanded ? 8 : 2}
              maxLength={LIST_BLURB_MAX}
              className={`w-full resize-y border border-line bg-paper px-2 py-1.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent ${
                expanded ? "min-h-40" : "min-h-0 flex-1"
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {expanded ? "Smaller field" : "Larger field"}
              </button>
              <p className="text-xs text-muted">
                {item.blurb.length}/{LIST_BLURB_MAX}
              </p>
            </div>
          </div>
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
