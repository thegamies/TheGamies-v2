import type { Metadata } from "next";
import { startGotyDraftAction } from "@/app/create/actions";
import { ListEditor } from "@/components/lists/ListEditor";
import { Button } from "@/components/ui/Button";
import { getAuthOrNull } from "@/lib/auth/server";
import { readListEditCookie } from "@/lib/lists/cookies";
import { readListDraftCookie } from "@/lib/lists/draft-cookie";
import {
  getEditableList,
  hydrateGamesByIgdbIds,
} from "@/lib/lists/service";
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
  const error = first(params.error) ?? null;
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
    }
  } else if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isFinite(year)) {
      loadError = "Pick a valid year.";
    } else {
      const draft = await readListDraftCookie();
      const resume =
        draft &&
        draft.listType === "goty" &&
        draft.year === Math.floor(year)
          ? draft
          : null;
      const games = resume
        ? await hydrateGamesByIgdbIds(resume.igdbIds)
        : [];
      const byIgdb = new Map(games.map((g) => [g.igdbId, g]));
      editor = {
        publicId: resume?.publicId ?? null,
        title: resume?.title || `${Math.floor(year)} Game of the Year`,
        year: Math.floor(year),
        slotCount: resume?.slotCount ?? 10,
        listFormat: resume?.listFormat,
        rankStyle: resume?.rankStyle,
        showSuffix: resume?.showSuffix,
        items: (resume?.igdbIds ?? [])
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
  } else {
    const draft = await readListDraftCookie();
    if (draft?.listType === "goty" && draft.year != null) {
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
  }

  return (
    <div>
      <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Game of the Year
      </p>

      {loadError ? (
        <p className="mb-6 text-sm text-accent" role="alert">
          {loadError}
        </p>
      ) : null}

      {editor ? (
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
        />
      ) : (
        <form action={startGotyDraftAction} className="max-w-sm space-y-4">
          <label className="block text-sm tracking-wide text-muted">
            Year
            <input
              name="year"
              type="number"
              required
              defaultValue={currentYear}
              className="mt-1 block w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <Button type="submit">Start GOTY list</Button>
        </form>
      )}
    </div>
  );
}
