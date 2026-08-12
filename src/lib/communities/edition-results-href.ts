import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

/** Build edition results URLs (`?view=` / `?mode=` / `?voter=`). */
export function editionResultsHref(
  slug: string,
  year: number,
  opts: {
    mode?: EditionResultsPublicMode;
    view?: EditionResultsViewId;
    votersPage?: number;
    q?: string;
    /** Frozen public ballot for this username (`?view=ballot&voter=`). */
    voter?: string;
  } = {},
) {
  const params = new URLSearchParams();
  const mode = opts.mode ?? "community";
  const view = opts.view ?? "overview";
  if (mode !== "community") params.set("mode", mode);
  if (view !== "overview") params.set("view", view);
  if (opts.votersPage && opts.votersPage > 1) {
    params.set("votersPage", String(opts.votersPage));
  }
  if (opts.q) params.set("q", opts.q);
  if (opts.voter) params.set("voter", opts.voter);
  const qs = params.toString();
  return `/communities/${encodeURIComponent(slug)}/edition/${year}${qs ? `?${qs}` : ""}`;
}

/** Public frozen ballot for a voter (or your own when username omitted). */
export function editionVoterBallotHref(
  slug: string,
  year: number,
  username?: string | null,
) {
  return editionResultsHref(slug, year, {
    view: "ballot",
    voter: username?.trim() || undefined,
  });
}
