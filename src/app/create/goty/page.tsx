import type { Metadata } from "next";
import { startGotyDraftAction } from "@/app/create/actions";
import { ListEditor } from "@/components/lists/ListEditor";
import { Button } from "@/components/ui/Button";
import { getAuthOrNull } from "@/lib/auth/server";
import { readListEditCookie } from "@/lib/lists/cookies";
import { getEditableList } from "@/lib/lists/service";
import { getProfileByAuthUserId } from "@/lib/profile/service";

export const metadata: Metadata = {
  title: "Create GOTY list",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const currentYear = new Date().getUTCFullYear();

export default async function CreateGotyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const publicId = first(params.id);
  const error = first(params.error) ?? null;

  let editor: {
    publicId: string;
    title: string;
    year: number | null;
    items: {
      gameId: string;
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
    let profileId: string | null = null;
    const auth = getAuthOrNull();
    if (auth) {
      try {
        const { data: session } = await auth.getSession();
        if (session?.user?.id) {
          const profile = await getProfileByAuthUserId(session.user.id);
          profileId = profile?.id ?? null;
        }
      } catch {
        profileId = null;
      }
    }
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
        items: result.items.map((item) => ({
          gameId: item.gameId,
          slug: item.slug,
          title: item.title,
          year: item.year,
          coverUrl: item.coverUrl,
          rank: item.rank,
          blurb: item.blurb ?? "",
        })),
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
