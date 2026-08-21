import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
  EditionSettingsPanelId,
} from "@/lib/communities/edition-results-scoring";

/** Build edition results URLs (`?view=` / `?panel=` / `?mode=` / …). */
export function editionResultsHref(
  slug: string,
  year: number,
  opts: {
    mode?: EditionResultsPublicMode;
    view?: EditionResultsViewId;
    /** Settings sub-tab (`?view=settings&panel=`). */
    panel?: EditionSettingsPanelId;
    /** Host results preview: demo placeholders vs live freeze. */
    source?: "demo" | "live";
    votersPage?: number;
    q?: string;
    voter?: string;
    category?: string;
    page?: number;
    previewPage?: number;
  } = {},
) {
  const params = new URLSearchParams();
  const mode = opts.mode ?? "community";
  const view = opts.view ?? "reveal";
  if (mode !== "community") params.set("mode", mode);
  // Bare URL is the spoiler-safe entrance (or Results after the window).
  // Reveal must be explicit so it does not collide with entrance.
  if (view === "overview") params.set("view", "results");
  else if (view === "reveal") params.set("view", "reveal");
  else if (view !== "entrance") params.set("view", view);
  if (view === "settings" && opts.panel && opts.panel !== "edition") {
    params.set("panel", opts.panel);
  }
  if (
    opts.source === "live" &&
    (view === "show" ||
      view === "overview" ||
      view === "standings" ||
      view === "categories" ||
      view === "category")
  ) {
    params.set("source", "live");
  }
  if (opts.votersPage && opts.votersPage > 1) {
    params.set("votersPage", String(opts.votersPage));
  }
  if (opts.q) params.set("q", opts.q);
  if (opts.voter) params.set("voter", opts.voter);
  if (opts.category) params.set("category", opts.category);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.previewPage && opts.previewPage > 1) {
    params.set("previewPage", String(opts.previewPage));
  }
  const qs = params.toString();
  return `/communities/${encodeURIComponent(slug)}/edition/${year}${qs ? `?${qs}` : ""}`;
}

/** Host Settings → Edition settings (schedule, categories, …). */
export function editionHostSettingsHref(slug: string, year: number) {
  return editionResultsHref(slug, year, {
    view: "settings",
    panel: "edition",
  });
}

/** Host Settings → Manage hosts. */
export function editionHostHostsHref(slug: string, year: number) {
  return editionResultsHref(slug, year, {
    view: "settings",
    panel: "hosts",
  });
}

/** Host Settings → Host preview (submitted ballots). */
export function editionHostPreviewHref(
  slug: string,
  year: number,
  opts: { previewPage?: number } = {},
) {
  return editionResultsHref(slug, year, {
    view: "settings",
    panel: "preview",
    previewPage: opts.previewPage,
  });
}

/** Host results preview (Reveal / Results / standings / categories) while closed. */
export function editionHostRevealShowHref(
  slug: string,
  year: number,
  opts: {
    source?: "demo" | "live";
    view?: "show" | "overview" | "standings" | "categories";
  } = {},
) {
  return editionResultsHref(slug, year, {
    view: opts.view ?? "show",
    source: opts.source ?? "demo",
  });
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

/** Full standings for one category award. */
export function editionCategoryStandingsHref(
  slug: string,
  year: number,
  categoryId: string,
  opts: { mode?: EditionResultsPublicMode; page?: number } = {},
) {
  return editionResultsHref(slug, year, {
    mode: opts.mode,
    view: "category",
    category: categoryId,
    page: opts.page,
  });
}
