import type { Metadata } from "next";
import Link from "next/link";
import { resetActiveDraftAction } from "@/app/create/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { readListEditCookie } from "@/lib/lists/cookies";
import { peekDraftFromCookie } from "@/lib/lists/service";

export const metadata: Metadata = {
  title: "Create a list",
};

export default async function CreateChooserPage() {
  const cookie = await readListEditCookie();
  const draft = await peekDraftFromCookie(cookie).catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Lists</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-7xl">
          Create
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Rank games for the year or build a custom list. Drafts save on this
          device so you can leave and come back.
        </p>

        {draft ? (
          <div className="mt-8 border border-line bg-panel p-5">
            <p className="text-sm text-muted">Unfinished draft</p>
            <p className="mt-1 text-lg text-ink">{draft.title}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={
                  draft.listType === "goty"
                    ? `/create/goty?id=${draft.publicId}`
                    : `/create/custom?id=${draft.publicId}`
                }
              >
                <Button type="button">Resume</Button>
              </Link>
              <form action={resetActiveDraftAction}>
                <Button type="submit" variant="bordered">
                  Reset
                </Button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/create/goty"
            className="border border-line p-6 transition-colors hover:border-accent"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Annual
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide text-ink">
              Game of the Year
            </h2>
            <p className="mt-3 text-muted">
              Rank up to 100 releases from a single year.
            </p>
          </Link>
          <Link
            href="/create/custom"
            className="border border-line p-6 transition-colors hover:border-accent"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Freeform
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide text-ink">
              Custom list
            </h2>
            <p className="mt-3 text-muted">
              Name it yourself and rank any games from the catalog.
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
