import type { Metadata } from "next";
import { startGotyDraftAction } from "@/app/create/actions";
import { ListEditor } from "@/components/lists/ListEditor";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { readListEditCookie } from "@/lib/lists/cookies";
import { getEditableList } from "@/lib/lists/service";
import { getAuthOrNull } from "@/lib/auth/server";
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
        })),
      };
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Game of the Year
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Build your ranking
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Your draft is saved as you go. Publish when the ranking is ready to
          share.
        </p>

        {loadError ? (
          <p className="mt-6 text-sm text-accent" role="alert">
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
          <form action={startGotyDraftAction} className="mt-10 max-w-sm space-y-4">
            <label className="block text-sm text-muted">
              Year
              <input
                name="year"
                type="number"
                required
                defaultValue={currentYear}
                className="mt-1 block w-full border border-line bg-panel px-3 py-2 text-ink"
              />
            </label>
            <Button type="submit">Start GOTY list</Button>
          </form>
        )}
      </main>
    </>
  );
}
