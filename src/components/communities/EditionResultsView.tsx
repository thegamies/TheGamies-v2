import Link from "next/link";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import type {
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
  EditionResultsMeta,
  EditionVoterListRow,
} from "@/lib/communities/edition-results";
import type { EditionResultMode } from "@/lib/communities/edition-results-scoring";

function modeHref(
  slug: string,
  year: number,
  mode: EditionResultMode,
  page: number,
  votersPage: number,
  q: string,
) {
  const params = new URLSearchParams();
  if (mode !== "combined") params.set("mode", mode);
  if (page > 1) params.set("page", String(page));
  if (votersPage > 1) params.set("votersPage", String(votersPage));
  if (q) params.set("q", q);
  const qs = params.toString();
  return `/communities/${slug}/edition/${year}${qs ? `?${qs}` : ""}`;
}

export function EditionResultsView({
  slug,
  year,
  mode,
  meta,
  topTen,
  standingsPage,
  categories,
  voters,
  yourProfileId,
}: {
  slug: string;
  year: number;
  mode: EditionResultMode;
  meta: EditionResultsMeta;
  topTen: EditionGotyStandingRow[];
  standingsPage: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionGotyStandingRow[];
  };
  categories: EditionCategoryStandingBlock[];
  voters: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionVoterListRow[];
    q: string;
  };
  yourProfileId: string | null;
}) {
  const winner = topTen[0] ?? null;
  const podium = topTen.slice(1, 3);
  const modes: EditionResultMode[] = ["combined", "community", "voices"];
  const ballotCount =
    mode === "voices" ? meta.ballotCountVoices : meta.ballotCountCommunity;

  return (
    <div className="mt-8 space-y-14">
      <div className="flex flex-wrap gap-2" aria-label="Results mode">
        {modes.map((m) => (
          <Link
            key={m}
            href={modeHref(slug, year, m, 1, voters.page, voters.q)}
            className={`border px-3 py-1.5 text-sm tracking-wide capitalize transition-colors ${
              m === mode
                ? "border-accent text-accent"
                : "border-line text-muted hover:border-accent hover:text-ink"
            }`}
          >
            {m}
          </Link>
        ))}
      </div>

      {winner ? (
        <section>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
            Winner
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div className="w-36 shrink-0 md:w-48">
              <GameCover title={winner.title} imageUrl={winner.coverUrl} />
            </div>
            <div>
              <RankMarker rank={1} size="lg" />
              <h3 className="mt-2 font-display text-4xl tracking-wide text-ink md:text-5xl">
                {winner.title}
              </h3>
              <p className="mt-3 text-sm text-muted">
                {winner.points} points · {winner.firstPlaceVotes} first-place
                votes · {ballotCount} ballots
              </p>
            </div>
          </div>
          {podium.length > 0 ? (
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {podium.map((row) => (
                <li
                  key={row.gameId}
                  className="flex items-center gap-3 border border-line bg-panel p-3"
                >
                  <RankMarker rank={row.place} />
                  <div className="w-14 shrink-0">
                    <GameCover title={row.title} imageUrl={row.coverUrl} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{row.title}</p>
                    <p className="text-sm text-muted">{row.points} points</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : (
        <p className="text-muted">No Game of the Year scores for this mode.</p>
      )}

      {topTen.length > 0 ? (
        <section>
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Top 10
          </h3>
          <ol className="mt-6 space-y-2">
            {topTen.map((row) => (
              <li
                key={row.gameId}
                className="flex items-center gap-3 border-b border-line py-3"
              >
                <RankMarker rank={row.place} className="w-8" />
                <div className="w-10 shrink-0">
                  <GameCover title={row.title} imageUrl={row.coverUrl} />
                </div>
                <p className="min-w-0 flex-1 font-semibold text-ink">
                  {row.title}
                </p>
                <p className="text-sm text-muted">{row.points}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {standingsPage.total > 10 ? (
        <section>
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Full standings
          </h3>
          <ol className="mt-6 space-y-2">
            {(standingsPage.page === 1
              ? standingsPage.rows.filter((row) => row.place > 10)
              : standingsPage.rows
            ).map((row) => (
              <li
                key={row.gameId}
                className="flex items-center gap-3 border-b border-line py-3"
              >
                <RankMarker rank={row.place} className="w-8" />
                <div className="w-10 shrink-0">
                  <GameCover title={row.title} imageUrl={row.coverUrl} />
                </div>
                <p className="min-w-0 flex-1 text-ink">{row.title}</p>
                <p className="text-sm text-muted">{row.points}</p>
              </li>
            ))}
          </ol>
          {standingsPage.totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {standingsPage.page > 1 ? (
                <Link
                  href={modeHref(
                    slug,
                    year,
                    mode,
                    standingsPage.page - 1,
                    voters.page,
                    voters.q,
                  )}
                  className="text-accent hover:underline"
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-muted">
                Page {standingsPage.page} of {standingsPage.totalPages}
              </span>
              {standingsPage.page < standingsPage.totalPages ? (
                <Link
                  href={modeHref(
                    slug,
                    year,
                    mode,
                    standingsPage.page + 1,
                    voters.page,
                    voters.q,
                  )}
                  className="text-accent hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="border-t border-line pt-10">
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Categories
          </h3>
          <div className="mt-8 space-y-10">
            {categories.map((cat) => {
              const win = cat.rows[0];
              return (
                <div key={cat.categoryId}>
                  <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
                    {cat.label}
                  </p>
                  {win ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-14 shrink-0">
                        <GameCover title={win.title} imageUrl={win.coverUrl} />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{win.title}</p>
                        <p className="text-sm text-muted">{win.votes} votes</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">No picks.</p>
                  )}
                  {cat.rows.length > 1 ? (
                    <ol className="mt-4 space-y-2 text-sm">
                      {cat.rows.slice(1).map((row) => (
                        <li
                          key={row.gameId}
                          className="flex justify-between gap-3 text-muted"
                        >
                          <span>
                            {row.place}. {row.title}
                          </span>
                          <span>{row.votes}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="border-t border-line pt-10">
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Voters
        </h3>
        <p className="mt-2 text-sm text-muted">
          {voters.total} submitted ballot{voters.total === 1 ? "" : "s"}
        </p>
        <form className="mt-4 flex flex-wrap gap-2" method="get">
          {mode !== "combined" ? (
            <input type="hidden" name="mode" value={mode} />
          ) : null}
          {standingsPage.page > 1 ? (
            <input type="hidden" name="page" value={String(standingsPage.page)} />
          ) : null}
          <input
            name="q"
            defaultValue={voters.q}
            placeholder="Search voters"
            className="border border-line bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Search voters"
          />
          <button
            type="submit"
            className="border border-line px-3 py-2 text-sm text-ink hover:border-accent"
          >
            Search
          </button>
        </form>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {voters.rows.map((v) => (
            <li key={v.profileId} className="py-3">
              <Link
                href={`/u/${v.username}`}
                className="text-ink hover:text-accent"
              >
                {v.displayName}
                {yourProfileId === v.profileId ? " (you)" : ""}
              </Link>
              <p className="text-sm text-muted">
                @{v.username}
                {v.isVoice ? " · Voice" : ""}
              </p>
            </li>
          ))}
        </ul>
        {voters.totalPages > 1 ? (
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {voters.page > 1 ? (
              <Link
                href={modeHref(
                  slug,
                  year,
                  mode,
                  standingsPage.page,
                  voters.page - 1,
                  voters.q,
                )}
                className="text-accent hover:underline"
              >
                Previous voters
              </Link>
            ) : null}
            <span className="text-muted">
              Page {voters.page} of {voters.totalPages}
            </span>
            {voters.page < voters.totalPages ? (
              <Link
                href={modeHref(
                  slug,
                  year,
                  mode,
                  standingsPage.page,
                  voters.page + 1,
                  voters.q,
                )}
                className="text-accent hover:underline"
              >
                Next voters
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
