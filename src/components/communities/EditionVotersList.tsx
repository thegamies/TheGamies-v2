import Link from "next/link";
import type { EditionVoterListRow } from "@/lib/communities/edition-results";
import {
  editionResultsHref,
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import { navItemClass } from "@/components/ui/navLevels";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
} from "@/lib/communities/edition-results-scoring";

export function EditionVotersList({
  slug,
  year,
  mode,
  voters,
  yourProfileId,
  revealBallots,
  showBoardModes = false,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  voters: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionVoterListRow[];
    q: string;
  };
  yourProfileId: string | null;
  /** When false (open/closed), names do not open ballots. */
  revealBallots: boolean;
  showBoardModes?: boolean;
}) {
  const modes: EditionResultsPublicMode[] = ["community", "voices"];

  return (
    <section>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted">
          {voters.total} submitted ballot{voters.total === 1 ? "" : "s"}
          {mode === "voices" ? " · Hosts" : ""}
        </p>
        {showBoardModes ? (
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1"
            aria-label="Voters board"
          >
            {modes.map((m, i) => (
              <span key={m} className="contents">
                {i > 0 ? (
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={editionResultsHref(slug, year, {
                    mode: m,
                    view: "voters",
                    votersPage: 1,
                    q: voters.q,
                  })}
                  className={navItemClass("tertiary", m === mode)}
                >
                  {editionBoardLabel(m)}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <form className="mt-4 flex flex-wrap gap-2" method="get">
        {mode !== "community" ? (
          <input type="hidden" name="mode" value={mode} />
        ) : null}
        <input type="hidden" name="view" value="voters" />
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
      {voters.rows.length === 0 ? (
        <p className="mt-6 text-muted">
          {voters.q
            ? "No voters match that search."
            : "No submitted ballots yet."}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {voters.rows.map((v) => (
            <li key={v.profileId} className="py-3">
              {revealBallots ? (
                <Link
                  href={editionVoterBallotHref(slug, year, v.username)}
                  className="text-ink hover:text-accent"
                >
                  {v.displayName}
                  {yourProfileId === v.profileId ? " (you)" : ""}
                </Link>
              ) : (
                <p className="text-ink">
                  {v.displayName}
                  {yourProfileId === v.profileId ? " (you)" : ""}
                </p>
              )}
              <p className="text-sm text-muted">
                <Link
                  href={`/u/${v.username}`}
                  className="hover:text-accent hover:underline"
                >
                  @{v.username}
                </Link>
                {v.isVoice ? " · Host" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {voters.totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {voters.page > 1 ? (
            <Link
              href={editionResultsHref(slug, year, {
                mode,
                view: "voters",
                votersPage: voters.page - 1,
                q: voters.q,
              })}
              className="text-accent hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-muted">
            Page {voters.page} of {voters.totalPages}
          </span>
          {voters.page < voters.totalPages ? (
            <Link
              href={editionResultsHref(slug, year, {
                mode,
                view: "voters",
                votersPage: voters.page + 1,
                q: voters.q,
              })}
              className="text-accent hover:underline"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
