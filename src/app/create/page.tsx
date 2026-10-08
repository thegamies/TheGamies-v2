import type { Metadata } from "next";
import Link from "next/link";
import { CreatePageHeader } from "@/components/lists/CreatePageHeader";
import { DiscardAnonDraftButton } from "@/components/lists/DiscardAnonDraftButton";
import { Button } from "@/components/ui/Button";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { readListDraftCookie } from "@/lib/lists/draft-cookie";
import { getPromotedTgaYear } from "@/lib/tga-pickem/service";
import { picksAreOpen } from "@/lib/tga-pickem/status";

export const metadata: Metadata = {
  title: "Create a list",
};

async function isSignedIn(): Promise<boolean> {
  const user = await getRequestSessionUser();
  if (!user?.id) return false;
  const profile = await getRequestProfileByAuthUserId(user.id).catch(() => null);
  return Boolean(profile);
}

function resumeHref(draft: {
  listType: "goty" | "custom";
  year: number | null;
  title: string;
}): string {
  if (draft.listType === "goty") {
    return `/create/goty?resume=1`;
  }
  return `/create/custom?resume=1`;
}

export default async function CreateChooserPage() {
  const signedIn = await isSignedIn();
  const draft = signedIn ? null : await readListDraftCookie();
  const tga = await getPromotedTgaYear().catch(() => null);
  const tgaOpen = tga ? picksAreOpen(tga) : false;

  return (
    <div className="w-full">
      <CreatePageHeader />
      {draft ? (
        <div className="mb-8 w-full border border-line bg-panel p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Unfinished ranking
          </p>
          <p className="mt-2 text-lg text-ink">{draft.title}</p>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Continue editing this ranking, or start a new list. Starting new
            permanently clears the unfinished ranking saved on this device.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={resumeHref(draft)}>
              <Button type="button">Continue editing</Button>
            </Link>
            <DiscardAnonDraftButton />
          </div>
        </div>
      ) : (
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
          {tgaOpen && tga ? (
            <Link
              href={`/the-game-awards/${tga.year}`}
              className="block w-full border border-line bg-panel px-5 py-6 text-left transition-colors hover:border-accent"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
                Video Game Awards Pick’em
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                Make your picks
              </p>
              <p className="mt-2 text-sm text-muted">
                Every official category, plus a World Premieres guess.
              </p>
            </Link>
          ) : null}
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
      )}
    </div>
  );
}
