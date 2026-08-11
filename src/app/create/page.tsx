import type { Metadata } from "next";
import Link from "next/link";
import { resetActiveDraftAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";
import { readListDraftCookie } from "@/lib/lists/draft-cookie";

export const metadata: Metadata = {
  title: "Create a list",
};

export default async function CreateChooserPage() {
  const draft = await readListDraftCookie();

  return (
    <div className="w-full">
      {draft ? (
        <div className="mb-8 w-full border border-line bg-panel p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Unfinished draft
          </p>
          <p className="mt-2 text-lg text-ink">{draft.title}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={
                draft.listType === "goty"
                  ? `/create/goty?year=${draft.year ?? ""}`
                  : `/create/custom?title=${encodeURIComponent(draft.title)}${
                      draft.year != null ? `&year=${draft.year}` : ""
                    }`
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

      <div className="grid w-full gap-3">
        <Link
          href="/create/goty"
          className="block w-full border border-line bg-panel px-5 py-6 text-left transition-colors hover:border-accent"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
            GOTY
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            Game of the Year
          </p>
          <p className="mt-2 text-sm text-muted">
            Search limited to releases from that year.
          </p>
        </Link>
        <Link
          href="/create/custom"
          className="block w-full border border-line bg-panel px-5 py-6 text-left transition-colors hover:border-accent"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
            Custom
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">Your own list</p>
          <p className="mt-2 text-sm text-muted">
            Any games, editable title.
          </p>
        </Link>
      </div>
    </div>
  );
}
