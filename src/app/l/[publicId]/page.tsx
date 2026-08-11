import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { CopyLinkButton } from "@/components/lists/CopyLinkButton";
import { SoftSavePrompt } from "@/components/lists/SoftSavePrompt";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import { getAuthOrNull } from "@/lib/auth/server";
import { readListEditCookie } from "@/lib/lists/cookies";
import { canEditList } from "@/lib/lists/ownership";
import { getPublishedByPublicId } from "@/lib/lists/service";
import { getProfileByAuthUserId } from "@/lib/profile/service";

type Params = Promise<{ publicId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { publicId } = await params;
  const data = await getPublishedByPublicId(publicId).catch(() => null);
  if (!data) return { title: "List" };
  return {
    title: data.list.title,
    description: data.list.year
      ? `${data.list.year} list on The Gamies`
      : `${data.list.title} on The Gamies`,
  };
}

export default async function SharedListPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { publicId } = await params;
  const sp = await searchParams;
  const error = first(sp.error);
  const saved = first(sp.saved) === "1";

  const data = await getPublishedByPublicId(publicId).catch(() => null);
  if (!data) notFound();

  const cookie = await readListEditCookie();
  let profileId: string | null = null;
  let isSignedIn = false;
  const auth = getAuthOrNull();
  if (auth) {
    try {
      const { data: session } = await auth.getSession();
      if (session?.user?.id) {
        isSignedIn = true;
        const profile = await getProfileByAuthUserId(session.user.id);
        profileId = profile?.id ?? null;
      }
    } catch {
      // ignore
    }
  }

  const editSecret =
    cookie?.publicId === publicId ? cookie.secret : null;
  const canEdit = canEditList(data.list, { profileId, editSecret });
  const canClaim =
    !data.list.profileId && Boolean(editSecret);
  const alreadyOwned = Boolean(
    data.list.profileId && profileId && data.list.profileId === profileId,
  );

  const editHref =
    data.list.listType === "goty"
      ? `/create/goty?id=${publicId}`
      : `/create/custom?id=${publicId}`;

  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.12),_transparent_55%)]" />
        <div className="relative">
          {data.list.year ? (
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              {data.list.year}
            </p>
          ) : (
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              List
            </p>
          )}
          <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-7xl">
            {data.list.title}
          </h1>
          <p className="mt-3 text-muted">
            {data.owner ? (
              <>
                By{" "}
                <Link
                  href={`/u/${data.owner.username}`}
                  className="text-ink hover:text-accent"
                >
                  {data.owner.displayName}
                </Link>
              </>
            ) : (
              "Anonymous list"
            )}
            <span className="text-muted">
              {" "}
              · {data.items.length}{" "}
              {data.items.length === 1 ? "game" : "games"}
            </span>
          </p>

          {saved ? (
            <p className="mt-4 text-sm text-ink">Saved to your account.</p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          <SoftSavePrompt
            publicId={publicId}
            canClaim={canClaim}
            isSignedIn={isSignedIn}
            alreadyOwned={alreadyOwned}
          />

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/create">
              <Button type="button">Make your own</Button>
            </Link>
            <CopyLinkButton />
            {canEdit ? (
              <Link href={editHref}>
                <Button type="button" variant="bordered">
                  Edit
                </Button>
              </Link>
            ) : null}
          </div>

          <ol className="mt-10 divide-y divide-line border-y border-line">
            {data.items.map((item) => (
              <li key={item.gameId} className="flex items-center gap-5 py-5">
                <RankMarker rank={item.rank} size="lg" />
                <div className="w-16 shrink-0 sm:w-20">
                  <GameCover title={item.title} imageUrl={item.coverUrl} />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/games/${item.slug}`}
                    className="block truncate text-lg text-ink hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  {item.year ? (
                    <p className="text-sm text-muted">{item.year}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </>
  );
}
