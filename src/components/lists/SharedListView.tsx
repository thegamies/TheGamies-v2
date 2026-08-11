import Link from "next/link";
import { CopyLinkButton } from "@/components/lists/CopyLinkButton";
import { RefreshOnBfcache } from "@/components/lists/RefreshOnBfcache";
import { SoftSavePrompt } from "@/components/lists/SoftSavePrompt";
import { ShareExportButton } from "@/components/list-export/ShareExportButton";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import type { ShareListPayload } from "@/lib/lists/service";

type SharedListViewProps = {
  data: ShareListPayload;
  canEdit: boolean;
  canClaim: boolean;
  isSignedIn: boolean;
  alreadyOwned: boolean;
  editHref: string;
  saved?: boolean;
  error?: string | null;
};

export function SharedListView({
  data,
  canEdit,
  canClaim,
  isSignedIn,
  alreadyOwned,
  editHref,
  saved = false,
  error = null,
}: SharedListViewProps) {
  return (
    <main className="relative mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <RefreshOnBfcache />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.12),_transparent_55%)]" />
      <div className="relative">
        {data.list.year ? (
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {data.list.year}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.2em] text-muted">List</p>
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
          publicId={data.list.publicId}
          canClaim={canClaim}
          isSignedIn={isSignedIn}
          alreadyOwned={alreadyOwned}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/create">
            <Button type="button">Make your own</Button>
          </Link>
          <CopyLinkButton />
          <ShareExportButton
            games={data.items.map((item) => ({
              id: item.gameId,
              title: item.title,
              imageUrl: item.coverUrl,
            }))}
            year={data.list.year ?? new Date().getUTCFullYear()}
            title={data.list.title}
            listType={data.list.listType === "custom" ? "custom" : "goty"}
          />
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
              <div className="min-w-0 flex-1">
                <Link
                  href={`/games/${item.slug}`}
                  className="block truncate text-lg text-ink hover:text-accent"
                >
                  {item.title}
                </Link>
                {item.year ? (
                  <p className="text-sm text-muted">{item.year}</p>
                ) : null}
                {item.blurb ? (
                  <p className="mt-2 max-w-2xl font-serif text-muted">
                    {item.blurb}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
