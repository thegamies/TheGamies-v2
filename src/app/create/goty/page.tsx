import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePageHeader } from "@/components/lists/CreatePageHeader";
import { ClearLocalGotyDraft } from "@/components/lists/ClearLocalGotyDraft";
import { DiscardAnonDraftButton } from "@/components/lists/DiscardAnonDraftButton";
import { ExistingGotyPreview } from "@/components/lists/ExistingGotyPreview";
import { ListEditor } from "@/components/lists/ListEditor";
import { StartGotyForm } from "@/components/lists/StartGotyForm";
import { Button } from "@/components/ui/Button";
import { getAuthOrNull } from "@/lib/auth/server";
import {
  draftMatchesGoty,
  editorSeedFromDraft,
} from "@/lib/lists/anon-editor-seed";
import { readListEditCookie } from "@/lib/lists/cookies";
import { readListDraftCookie } from "@/lib/lists/draft-cookie";
import { existingGotyEditHref } from "@/lib/lists/existing-goty";
import {
  getOwnedGotyForYear,
  getOwnedGotyItemsForYear,
  getEditableList,
  hydrateGamesByIgdbIds,
} from "@/lib/lists/service";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { parseStoredListFormat, parseStoredRankStyle } from "@/lib/lists/schema";
import {
  createGotyEntryMode,
  shouldDiscardLocalGotyDraft,
} from "@/lib/lists/create-goty-entry";
import { parseListShareView, withListShareView } from "@/lib/lists/urls";
import {
  getCategoryVotesForList,
  listActiveAwardCategories,
} from "@/lib/live-aggregate/categories";
import { getProfileByAuthUserId } from "@/lib/profile/service";

export const metadata: Metadata = {
  title: "Create GOTY list",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const currentYear = new Date().getUTCFullYear();

async function sessionProfileId(): Promise<string | null> {
  const auth = getAuthOrNull();
  if (!auth) return null;
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) return null;
    const profile = await getProfileByAuthUserId(session.user.id);
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

export default async function CreateGotyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const publicId = first(params.id);
  const yearParam = first(params.year);
  const resume = first(params.resume) === "1";
  const error = first(params.error) ?? null;
  const editorView = parseListShareView(first(params.view));
  const authIntent = parseListAuthIntent(first(params.intent));
  const profileId = await sessionProfileId();
  const signedIn = Boolean(profileId);
  const awardCategories = await listActiveAwardCategories().catch(() => []);
  const localDraft = await readListDraftCookie();
  const draftIsGoty = localDraft?.listType === "goty";
  const draftYear = draftIsGoty ? localDraft.year : null;
  const urlYear =
    yearParam && Number.isFinite(Number(yearParam))
      ? Math.floor(Number(yearParam))
      : null;
  let ownedForDraftYear: Awaited<
    ReturnType<typeof getOwnedGotyForYear>
  > = null;
  if (profileId && draftIsGoty && draftYear != null) {
    ownedForDraftYear = await getOwnedGotyForYear(profileId, draftYear).catch(
      () => null,
    );
  }
  let ownedForUrlYear: Awaited<ReturnType<typeof getOwnedGotyForYear>> = null;
  if (profileId && urlYear != null) {
    ownedForUrlYear =
      draftYear === urlYear
        ? ownedForDraftYear
        : await getOwnedGotyForYear(profileId, urlYear).catch(() => null);
  }
  const discardCookieDraft = shouldDiscardLocalGotyDraft({
    signedIn,
    draftIsGoty: Boolean(draftIsGoty),
    draftYear,
    accountHasGotyForYear: Boolean(ownedForDraftYear),
  });
  // Cookie may be empty while localStorage still has a GOTY draft for ?year=.
  const discardShownYearDraft = shouldDiscardLocalGotyDraft({
    signedIn,
    draftIsGoty: true,
    draftYear: urlYear,
    accountHasGotyForYear: Boolean(ownedForUrlYear),
  });
  const discardLocalGotyDraft =
    discardCookieDraft || (Boolean(authIntent) && discardShownYearDraft);
  const ownedToOpen = ownedForDraftYear ?? ownedForUrlYear;
  // Cookie writes are not allowed from this page — ClearLocalGotyDraft
  // clears cookie + localStorage after the owned list is shown.
  if (discardLocalGotyDraft && !publicId && ownedToOpen) {
    redirect(
      withListShareView(
        existingGotyEditHref(ownedToOpen.publicId),
        editorView,
      ),
    );
  }

  let editor: {
    publicId: string | null;
    title: string;
    year: number | null;
    slotCount: number;
    listFormat?: "poster" | "list" | "grid";
    rankStyle?: "banner" | "chip" | "off";
    showSuffix?: boolean;
    items: {
      gameId: string;
      igdbId: number;
      slug: string;
      title: string;
      year: number | null;
      coverUrl: string | null;
      rank: number;
      blurb: string;
    }[];
    categoryVotes?: {
      categoryId: string;
      gameId: string;
      title: string;
      coverUrl: string | null;
    }[];
  } | null = null;
  let existingList: {
    publicId: string;
    title: string;
    year: number;
    items: {
      gameId: string;
      slug: string;
      title: string;
      coverUrl: string | null;
      rank: number;
    }[];
  } | null = null;
  let loadError: string | null = error;

  const entryMode = createGotyEntryMode({
    publicId,
    signedIn,
    resume,
    authIntent: Boolean(authIntent),
    yearParam,
    discardLocalGotyDraft,
  });

  if (entryMode === "load-by-id" && publicId) {
    const cookie = await readListEditCookie();
    const result = await getEditableList(publicId, {
      profileId,
      editSecret:
        cookie?.publicId === publicId ? cookie.secret : null,
    });
    if ("error" in result) {
      loadError = result.error;
    } else {
      editor = {
        publicId: result.list.publicId,
        title: result.list.title,
        year: result.list.year,
        slotCount: 10,
        rankStyle: parseStoredRankStyle(result.list.rankStyle),
        showSuffix: result.list.showSuffix,
        listFormat: parseStoredListFormat(result.list.listFormat),
        items: result.items.map((item) => ({
          gameId: item.gameId,
          igdbId: item.igdbId,
          slug: item.slug,
          title: item.title,
          year: item.year,
          coverUrl: item.coverUrl,
          rank: item.rank,
          blurb: signedIn ? (item.blurb ?? "") : "",
        })),
        categoryVotes:
          signedIn && result.list.profileId
            ? await getCategoryVotesForList(result.list.id).catch(() => [])
            : [],
      };

      // Prefer the device draft when it matches — anon edits land in the
      // cookie immediately and may be ahead of the last DB sync.
      if (!signedIn) {
        const draft = await readListDraftCookie();
        if (
          draft &&
          draft.publicId === publicId &&
          draft.listType === "goty"
        ) {
          const games = await hydrateGamesByIgdbIds(draft.igdbIds);
          const byIgdb = new Map(games.map((g) => [g.igdbId, g]));
          editor = {
            publicId,
            title: draft.title || editor.title,
            year: draft.year ?? editor.year,
            slotCount: draft.slotCount,
            listFormat: draft.listFormat,
            rankStyle: draft.rankStyle,
            showSuffix: draft.showSuffix,
            items: draft.igdbIds
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
                };
              })
              .filter(
                (item): item is NonNullable<typeof item> => Boolean(item),
              ),
          };
        }
      }
    }
  } else if (entryMode === "anon-resume") {
    const draft = await readListDraftCookie();
    if (!draft || draft.listType !== "goty" || draft.year == null) {
      loadError = "No unfinished Game of the Year ranking on this device.";
    } else {
      const games = await hydrateGamesByIgdbIds(draft.igdbIds);
      const byIgdb = new Map(games.map((g) => [g.igdbId, g]));
      editor = {
        publicId: draft.publicId ?? null,
        title: draft.title,
        year: draft.year,
        slotCount: draft.slotCount,
        listFormat: draft.listFormat,
        rankStyle: draft.rankStyle,
        showSuffix: draft.showSuffix,
        items: draft.igdbIds
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
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      };
    }
  } else if (entryMode === "auth-intent") {
    // Restore draft after Save/Share sign-in or create account.
    const draft = await readListDraftCookie();
    if (draft && draft.listType === "goty") {
      editor = await editorSeedFromDraft(draft);
    } else if (yearParam && Number.isFinite(Number(yearParam))) {
      const y = Math.floor(Number(yearParam));
      editor = {
        publicId: null,
        title: `${y} Game of the Year`,
        year: y,
        slotCount: 10,
        items: [],
      };
    } else {
      loadError = "Could not restore your ranking after signing in.";
    }
  } else if (entryMode === "signed-in-year" && profileId) {
    // Use ?year= when present; otherwise fetch for the picker's default year.
    const year = yearParam ? Number(yearParam) : currentYear;
    if (yearParam && !Number.isFinite(year)) {
      loadError = "Pick a valid year.";
    } else {
      const y = Math.floor(year);
      const list =
        urlYear === y
          ? ownedForUrlYear
          : await getOwnedGotyForYear(profileId, y).catch(() => null);
      if (list) {
        const items =
          (await getOwnedGotyItemsForYear(profileId, y, { limit: 5 }).catch(
            () => null,
          )) ?? [];
        existingList = {
          publicId: list.publicId,
          title: list.title,
          year: y,
          items: items.map((item) => ({
            gameId: item.gameId,
            slug: item.slug,
            title: item.title,
            coverUrl: item.coverUrl,
            rank: item.rank,
          })),
        };
      }
    }
  } else if (entryMode === "anon-year" && yearParam) {
    const year = Number(yearParam);
    if (!Number.isFinite(year)) {
      loadError = "Pick a valid year.";
    } else {
      const y = Math.floor(year);
      const existingDraft = await readListDraftCookie();
      if (existingDraft && draftMatchesGoty(existingDraft, y)) {
        editor = await editorSeedFromDraft(existingDraft);
      } else if (existingDraft) {
        return (
          <div>
            <CreatePageHeader />
            <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Game of the Year
            </p>
            <div className="border border-line bg-panel p-5">
              <p className="font-display text-2xl tracking-wide text-ink">
                Unfinished ranking on this device
              </p>
              <p className="mt-2 text-sm text-muted">
                You already have “{existingDraft.title}” saved here. Continue
                editing it, or start a new list and lose that ranking.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={
                    existingDraft.listType === "goty"
                      ? "/create/goty?resume=1"
                      : "/create/custom?resume=1"
                  }
                >
                  <Button type="button">Continue editing</Button>
                </Link>
                <DiscardAnonDraftButton next={`/create/goty?year=${y}`} />
              </div>
            </div>
          </div>
        );
      } else {
        editor = {
          publicId: null,
          title: `${y} Game of the Year`,
          year: y,
          slotCount: 10,
          items: [],
        };
      }
    }
  }

  if (editor) {
    const clearOwnedDraftYear =
      signedIn &&
      editor.year != null &&
      (discardLocalGotyDraft || Boolean(editor.publicId))
        ? editor.year
        : null;
    return (
      <div>
        {clearOwnedDraftYear != null ? (
          <ClearLocalGotyDraft year={clearOwnedDraftYear} />
        ) : null}
        <ListEditor
          publicId={editor.publicId}
          listType="goty"
          initialTitle={editor.title}
          initialYear={editor.year}
          initialItems={editor.items}
          initialSlotCount={editor.slotCount}
          initialListFormat={editor.listFormat}
          initialRankStyle={editor.rankStyle}
          initialShowSuffix={editor.showSuffix}
          signedIn={signedIn}
          error={error}
          authIntent={discardLocalGotyDraft ? null : authIntent}
          returnPath={
            editor.year != null
              ? `/create/goty?year=${editor.year}`
              : "/create/goty"
          }
          awardCategories={awardCategories}
          initialCategoryVotes={editor.categoryVotes ?? []}
          initialView={editorView}
        />
      </div>
    );
  }

  const formYear =
    existingList?.year ??
    (yearParam && Number.isFinite(Number(yearParam))
      ? Math.floor(Number(yearParam))
      : currentYear);
  const pickerClearYear =
    existingList?.year ??
    (discardLocalGotyDraft ? (draftYear ?? urlYear) : null);

  return (
    <div>
      {pickerClearYear != null ? (
        <ClearLocalGotyDraft year={pickerClearYear} />
      ) : null}
      <CreatePageHeader />
      <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Game of the Year
      </p>

      {loadError ? (
        <p className="mb-6 text-sm text-accent" role="alert">
          {loadError}
        </p>
      ) : null}

      <StartGotyForm
        key={formYear}
        defaultYear={formYear}
        syncYearInUrl={signedIn}
        hasExistingForYear={Boolean(existingList)}
        error={error}
        editorView={editorView}
      />

      {existingList ? (
        <div className="mt-8">
          <ExistingGotyPreview
            year={existingList.year}
            publicId={existingList.publicId}
            title={existingList.title}
            items={existingList.items}
            editorView={editorView}
          />
        </div>
      ) : null}
    </div>
  );
}
