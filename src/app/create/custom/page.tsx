import type { Metadata } from "next";
import Link from "next/link";
import { CreatePageHeader } from "@/components/lists/CreatePageHeader";
import { DiscardAnonDraftButton } from "@/components/lists/DiscardAnonDraftButton";
import { ListEditor } from "@/components/lists/ListEditor";
import { StartCustomForm } from "@/components/lists/StartCustomForm";
import { Button } from "@/components/ui/Button";
import { getAuthOrNull } from "@/lib/auth/server";
import {
  draftMatchesCustom,
  editorSeedFromDraft,
} from "@/lib/lists/anon-editor-seed";
import { readListEditCookie } from "@/lib/lists/cookies";
import { readListDraftCookie } from "@/lib/lists/draft-cookie";
import {
  getEditableList,
  hydrateGamesByIgdbIds,
} from "@/lib/lists/service";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { getProfileByAuthUserId } from "@/lib/profile/service";

export const metadata: Metadata = {
  title: "Create custom list",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function CreateCustomPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const publicId = first(params.id);
  const titleParam = first(params.title);
  const yearParam = first(params.year);
  const resume = first(params.resume) === "1";
  const error = first(params.error) ?? null;
  const authIntent = parseListAuthIntent(first(params.intent));
  const profileId = await sessionProfileId();
  const signedIn = Boolean(profileId);

  let editor: {
    publicId: string | null;
    title: string;
    year: number | null;
    slotCount: number;
    listFormat?: "poster" | "list";
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
  } | null = null;
  let loadError: string | null = error;

  if (publicId) {
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
        slotCount: Math.max(10, result.items.length),
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
      };

      if (!signedIn) {
        const draft = await readListDraftCookie();
        if (
          draft &&
          draft.publicId === publicId &&
          draft.listType === "custom"
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
  } else if (!signedIn && resume) {
    const draft = await readListDraftCookie();
    if (!draft || draft.listType !== "custom") {
      loadError = "No unfinished custom ranking on this device.";
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
  } else if (!signedIn && titleParam) {
    const year =
      yearParam && Number.isFinite(Number(yearParam))
        ? Math.floor(Number(yearParam))
        : null;
    const title = titleParam.trim();
    const existingDraft = await readListDraftCookie();
    if (existingDraft && draftMatchesCustom(existingDraft, title)) {
      editor = await editorSeedFromDraft(existingDraft);
    } else if (existingDraft) {
      const params = new URLSearchParams({ title });
      if (year != null) params.set("year", String(year));
      return (
        <div>
          <CreatePageHeader />
          <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Custom list
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
              <DiscardAnonDraftButton
                next={`/create/custom?${params.toString()}`}
              />
            </div>
          </div>
        </div>
      );
    } else {
      editor = {
        publicId: null,
        title,
        year,
        slotCount: 10,
        items: [],
      };
    }
  } else if (signedIn && authIntent) {
    const draft = await readListDraftCookie();
    if (draft && draft.listType === "custom") {
      editor = await editorSeedFromDraft(draft);
    } else if (titleParam?.trim()) {
      editor = {
        publicId: null,
        title: titleParam.trim(),
        year:
          yearParam && Number.isFinite(Number(yearParam))
            ? Math.floor(Number(yearParam))
            : null,
        slotCount: 10,
        items: [],
      };
    } else {
      loadError = "Could not restore your ranking after signing in.";
    }
  }

  if (editor) {
    return (
      <div>
        <ListEditor
          publicId={editor.publicId}
          listType="custom"
          initialTitle={editor.title}
          initialYear={editor.year}
          initialItems={editor.items}
          initialSlotCount={editor.slotCount}
          initialListFormat={editor.listFormat}
          initialRankStyle={editor.rankStyle}
          initialShowSuffix={editor.showSuffix}
          signedIn={signedIn}
          error={error}
          authIntent={authIntent}
          returnPath={(() => {
            const params = new URLSearchParams({ title: editor.title });
            if (editor.year != null) params.set("year", String(editor.year));
            return `/create/custom?${params.toString()}`;
          })()}
        />
      </div>
    );
  }

  return (
    <div>
      <CreatePageHeader />
      <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Custom list
      </p>

      {loadError ? (
        <p className="mb-6 text-sm text-accent" role="alert">
          {loadError}
        </p>
      ) : null}

      <StartCustomForm error={error} />
    </div>
  );
}
