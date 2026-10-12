/**
 * Canonical inventory of product routes, APIs, and important mutations.
 * `docs/endpoints.md` and `e2e/.cost/endpoints.html` (render script) read this file.
 * When you add or retire a URL, update this list in the same change.
 */

export const SITE_ENDPOINT_GROUPS = [
  "home",
  "catalog",
  "lists",
  "live-goty",
  "people",
  "communities",
  "tga",
  "auth",
  "account",
  "legal",
  "admin",
  "system",
] as const;

export type SiteEndpointGroup = (typeof SITE_ENDPOINT_GROUPS)[number];

export type SiteEndpointKind = "page" | "api" | "action" | "cron" | "webhook";

export type SiteEndpointAudience =
  | "public"
  | "member"
  | "host"
  | "admin"
  | "system";

/** 1 = rare, 5 = GOTY-night / streamer-link volume. */
export type SiteEndpointScale = 1 | 2 | 3 | 4 | 5;

/**
 * 1 = test last (legal, redirects). 4 = test first (hot + heavy).
 * Combines expected use with database cost — not a product ranking.
 */
export type SiteEndpointTestPriority = 1 | 2 | 3 | 4;

export type SiteEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "GET+POST" | "action";
  path: string;
  kind: SiteEndpointKind;
  group: SiteEndpointGroup;
  audience: SiteEndpointAudience;
  /** How often we expect people to hit it. */
  usage: SiteEndpointScale;
  /** Relative Neon work per hit (trips, fat SQL, writes). */
  dbImpact: SiteEndpointScale;
  testPriority: SiteEndpointTestPriority;
  /**
   * How easy this GET is to put in OpenNext incremental cache (R2).
   * 5 = public, few keys, stable. 1 = do not cache (POST, session, unbounded q).
   */
  cacheEase: SiteEndpointScale;
  /**
   * How hard it is to keep that cache correct.
   * 5 = a person saving a list/sheet must purge (or we lie). 1 = almost never invalidates.
   */
  cacheComplexity: SiteEndpointScale;
  cacheNotes: string;
  notes: string;
  /** True when the staging traffic mix already hammers this shape. */
  loadMix?: boolean;
  /** Dedicated unit tests for this route’s behavior (not a shared helper). */
  unitTests?: boolean;
  /** Playwright (or staging spec) exercises this URL. */
  e2eTests?: boolean;
};

type SiteEndpointInput = Omit<
  SiteEndpoint,
  "cacheEase" | "cacheComplexity" | "cacheNotes"
> & {
  cacheEase?: SiteEndpointScale;
  cacheComplexity?: SiteEndpointScale;
  cacheNotes?: string;
};

function cacheHints(input: SiteEndpointInput): Pick<
  SiteEndpoint,
  "cacheEase" | "cacheComplexity" | "cacheNotes"
> {
  const byPath: Record<
    string,
    Pick<SiteEndpoint, "cacheEase" | "cacheComplexity" | "cacheNotes">
  > = {
    "/": {
      cacheEase: 3,
      cacheComplexity: 5,
      cacheNotes:
        "Site trending strip uses Workers Cache (60s, colo-local). Full HTML still session-aware. Following/community trending stay live.",
    },
    "/games": {
      cacheEase: 4,
      cacheComplexity: 2,
      cacheNotes:
        "Default pager total is site_settings.catalog_game_count (refreshed on IGDB game upserts), not COUNT(*) per visit. First page of covers still hits games.",
    },
    "/games?q=": {
      cacheEase: 2,
      cacheComplexity: 3,
      cacheNotes:
        "SQL title search, LIMIT page+1, no COUNT(*). Do not cache unique q= keys.",
    },
    "/games/:slug": {
      cacheEase: 4,
      cacheComplexity: 3,
      cacheNotes:
        "Covers, videos, and companies only move on IGDB sync — easy R2. GOTY-on-this-game must purge or TTL when someone saves a list.",
    },
    "/api/games/search": {
      cacheEase: 2,
      cacheComplexity: 3,
      cacheNotes:
        "Workers Cache 5 min, keyed by q + filters + site_settings.catalog_game_count (colo-local). Unique q= is still a weak load-mix / R2 target.",
    },
    "/game-of-the-year": {
      cacheEase: 3,
      cacheComplexity: 5,
      cacheNotes:
        "Public and hot, but every owned GOTY save dirties year chips and highlights. Tag-per-year purge or a short TTL.",
    },
    "/game-of-the-year/:year": {
      cacheEase: 3,
      cacheComplexity: 5,
      cacheNotes:
        "Standings HTML is a great cache if we accept delay. A list save must drop that year’s tag or the board lies.",
    },
    "/game-of-the-year/:year/categories": {
      cacheEase: 3,
      cacheComplexity: 5,
      cacheNotes:
        "Same as year standings, plus one key per category. User votes/lists invalidate.",
    },
    "/rankings": {
      cacheEase: 5,
      cacheComplexity: 1,
      cacheNotes:
        "Static explainer. Easiest OpenNext/R2 put; almost never purge.",
    },
    "/the-game-awards/:year": {
      cacheEase: 3,
      cacheComplexity: 4,
      cacheNotes:
        "Public standings can live in R2 until sheets save. Show night = frequent purge or short TTL.",
    },
    "the-game-awards/actions.ts#saveSiteTgaSheetAction": {
      cacheEase: 1,
      cacheComplexity: 5,
      cacheNotes:
        "Show-night writes. Purge that year’s Pick’em standings; do not cache the POST.",
    },
    "create/actions.ts#saveOwnedListAction": {
      cacheEase: 1,
      cacheComplexity: 5,
      cacheNotes:
        "Not a cache. This is the purge: GOTY boards, home activity, game pages, the list URL.",
    },
    "library/actions.ts#setLibraryStatusAction": {
      cacheEase: 1,
      cacheComplexity: 4,
      cacheNotes: "Not a cache. Dirties home activity (and profile library).",
    },
    "/u/:username/:listSlug": {
      cacheEase: 4,
      cacheComplexity: 4,
      cacheNotes: "Same as share link: purge on that list’s save.",
    },
    "/u/:username": {
      cacheEase: 3,
      cacheComplexity: 4,
      cacheNotes: "Public profile. List create/delete and avatar upload must purge.",
    },
    "/create/goty": {
      cacheEase: 1,
      cacheComplexity: 4,
      cacheNotes: "Editor is session + draft. Cache search API, not this page.",
    },
    "/communities/:slug/results": {
      cacheEase: 4,
      cacheComplexity: 2,
      cacheNotes:
        "Frozen boards barely move. Strong R2 candidate after publish; purge on rebuild only.",
    },
    "/api/cron/edition-freeze": {
      cacheEase: 1,
      cacheComplexity: 4,
      cacheNotes: "Not a cache. After it runs, drop that edition’s result tags.",
    },
  };
  const named = byPath[input.path];
  if (named) return named;

  if (
    input.kind === "action" ||
    input.kind === "cron" ||
    input.kind === "webhook"
  ) {
    return {
      cacheEase: 1,
      cacheComplexity: 2,
      cacheNotes: "Write or clock. Cache the GET it dirties, not this.",
    };
  }
  if (input.group === "legal") {
    return {
      cacheEase: 5,
      cacheComplexity: 1,
      cacheNotes: "Copy pages. Easy R2; low traffic so later.",
    };
  }
  if (input.audience === "member" || input.audience === "host") {
    return {
      cacheEase: 2,
      cacheComplexity: 4,
      cacheNotes:
        "Cookie-split. A member save (ballot, sheet, settings) has to drop their keys.",
    };
  }
  if (input.audience === "admin" || input.audience === "system") {
    return {
      cacheEase: 1,
      cacheComplexity: 2,
      cacheNotes: "Ops or machine traffic. Skip R2.",
    };
  }
  if (input.group === "auth" || input.group === "account") {
    return {
      cacheEase: 1,
      cacheComplexity: 3,
      cacheNotes: "Session. Do not cache HTML.",
    };
  }
  return {
    cacheEase: 3,
    cacheComplexity: 3,
    cacheNotes:
      "Public GET. Fine for a short OpenNext/R2 TTL; confirm what user writes must purge.",
  };
}

function row(endpoint: SiteEndpointInput): SiteEndpoint {
  const cache = cacheHints(endpoint);
  return {
    ...endpoint,
    cacheEase: endpoint.cacheEase ?? cache.cacheEase,
    cacheComplexity: endpoint.cacheComplexity ?? cache.cacheComplexity,
    cacheNotes: endpoint.cacheNotes ?? cache.cacheNotes,
  };
}

export const SITE_ENDPOINTS: SiteEndpoint[] = [
  row({
    method: "GET",
    path: "/",
    kind: "page",
    group: "home",
    audience: "public",
    usage: 5,
    dbImpact: 4,
    testPriority: 4,
    loadMix: true,
    notes:
      "Default land. Standings rails plus a Workers-cached site trending strip. Streamer-link risk.",
  }),
  row({
    method: "GET",
    path: "/games",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 5,
    dbImpact: 3,
    testPriority: 4,
    loadMix: true,
    notes:
      "Paged catalog. Default total from site_settings; year/release filters still COUNT(*). Trending uses Workers Cache on the public site board.",
  }),
  row({
    method: "GET",
    path: "/games?q=",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 4,
    dbImpact: 4,
    testPriority: 4,
    loadMix: true,
    notes:
      "Title search in SQL. Page via LIMIT+1; no catalog COUNT(*). Short queries scan more loosely.",
  }),
  row({
    method: "GET",
    path: "/games/:slug",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 5,
    dbImpact: 5,
    testPriority: 4,
    loadMix: true,
    notes: "About a dozen sequential catalog and standings trips per game.",
  }),
  row({
    method: "GET",
    path: "/api/games/search",
    kind: "api",
    group: "catalog",
    audience: "public",
    usage: 4,
    dbImpact: 3,
    testPriority: 4,
    loadMix: true,
    notes: "List-editor typeahead. Same browse search, JSON, capped hits.",
  }),
  row({
    method: "GET",
    path: "/game-of-the-year",
    kind: "page",
    group: "live-goty",
    audience: "public",
    usage: 5,
    dbImpact: 4,
    testPriority: 4,
    loadMix: true,
    notes: "GOTY hub. Year chips and live boards.",
  }),
  row({
    method: "GET",
    path: "/game-of-the-year/:year",
    kind: "page",
    group: "live-goty",
    audience: "public",
    usage: 5,
    dbImpact: 4,
    testPriority: 4,
    loadMix: true,
    notes: "Year standings. Precomputed scores, still several board queries.",
  }),
  row({
    method: "GET",
    path: "/game-of-the-year/:year/categories",
    kind: "page",
    group: "live-goty",
    audience: "public",
    usage: 4,
    dbImpact: 4,
    testPriority: 4,
    loadMix: true,
    notes: "Category index and a single category board (`?category=`).",
  }),
  row({
    method: "GET",
    path: "/rankings",
    kind: "page",
    group: "live-goty",
    audience: "public",
    usage: 3,
    dbImpact: 1,
    testPriority: 2,
    loadMix: true,
    notes: "Explainer. Cheap.",
  }),
  row({
    method: "action",
    path: "create/actions.ts#saveOwnedListAction",
    kind: "action",
    group: "lists",
    audience: "member",
    usage: 4,
    dbImpact: 5,
    testPriority: 4,
    loadMix: true,
    notes:
      "Create/edit/reorder/delete items. ~10–13 sequential round trips plus contrib clear. Load mix uses the staging write route.",
  }),
  row({
    method: "action",
    path: "library/actions.ts#setLibraryStatusAction",
    kind: "action",
    group: "lists",
    audience: "member",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Library upsert plus activity. A few trips.",
  }),
  row({
    method: "GET",
    path: "/create",
    kind: "page",
    group: "lists",
    audience: "public",
    usage: 3,
    dbImpact: 2,
    testPriority: 3,
    loadMix: true,
    notes: "Start a list. Search typeahead hits /api/games/search.",
  }),
  row({
    method: "GET",
    path: "/create/goty",
    kind: "page",
    group: "lists",
    audience: "public",
    usage: 4,
    dbImpact: 3,
    testPriority: 4,
    loadMix: true,
    unitTests: true,
    notes: "GOTY editor. Hydrates games; save is the heavy mutation.",
  }),
  row({
    method: "GET",
    path: "/create/custom",
    kind: "page",
    group: "lists",
    audience: "public",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Custom list editor.",
  }),
  row({
    method: "GET",
    path: "/u/:username/:listSlug",
    kind: "page",
    group: "lists",
    audience: "public",
    usage: 4,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Canonical list URL on a profile.",
  }),
  row({
    method: "GET",
    path: "/u/:username",
    kind: "page",
    group: "people",
    audience: "public",
    usage: 4,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Profile and paged lists.",
  }),
  row({
    method: "GET",
    path: "/people",
    kind: "page",
    group: "people",
    audience: "public",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Username search in SQL.",
  }),
  row({
    method: "GET",
    path: "/following",
    kind: "page",
    group: "people",
    audience: "member",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Follow graph. Later-launch surface; still live.",
  }),
  row({
    method: "action",
    path: "follow/actions.ts#followProfileAction",
    kind: "action",
    group: "people",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Follow / unfollow writes.",
  }),
  row({
    method: "GET",
    path: "/communities",
    kind: "page",
    group: "communities",
    audience: "public",
    usage: 3,
    dbImpact: 2,
    testPriority: 2,
    notes: "Featured plus memberships. Capped featured set.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug",
    kind: "page",
    group: "communities",
    audience: "public",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    notes: "Community home. Visibility splits guest vs member.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/live/:year",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 4,
    testPriority: 3,
    notes: "Live community rankings. Board queries.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/edition/:year",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 4,
    testPriority: 3,
    notes: "Edition hub, ballot, or results depending on schedule.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/ballot",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    notes: "Hidden ballot editor until close.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/results",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 4,
    testPriority: 3,
    loadMix: true,
    notes: "Frozen Combined / Community / Hosts. Paged SQL boards.",
  }),
  row({
    method: "GET",
    path: "/api/communities/:slug/edition/:year/standings",
    kind: "api",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    notes: "Paged standings JSON for results UI.",
  }),
  row({
    method: "GET",
    path: "/api/communities/:slug/edition/:year/categories",
    kind: "api",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 3,
    testPriority: 3,
    notes: "Category board JSON.",
  }),
  row({
    method: "GET",
    path: "/api/communities/:slug/edition/:year/comparison",
    kind: "api",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 4,
    testPriority: 3,
    notes: "Comparison matrix. Heavier than podium views.",
  }),
  row({
    method: "action",
    path: "communities/actions.ts#saveEditionBallotAction",
    kind: "action",
    group: "communities",
    audience: "member",
    usage: 3,
    dbImpact: 4,
    testPriority: 3,
    loadMix: true,
    notes: "Ballot save. Several writes; load mix on filling scenario.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/members",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Paged member directory and search.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/settings",
    kind: "page",
    group: "communities",
    audience: "host",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Host settings. Many small writes, not a public hot path.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/trending",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Community trending board.",
  }),
  row({
    method: "GET",
    path: "/communities/new",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Create a community.",
  }),
  row({
    method: "GET",
    path: "/communities/join/:code",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Invite join.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/create/event",
    kind: "page",
    group: "communities",
    audience: "host",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Create edition.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/live",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Live year picker.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/edition",
    kind: "page",
    group: "communities",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Edition year picker.",
  }),
  row({
    method: "GET",
    path: "/the-game-awards",
    kind: "page",
    group: "tga",
    audience: "public",
    usage: 3,
    dbImpact: 2,
    testPriority: 2,
    notes: "Pick’em hub. Show-night traffic is spiky, not year-round.",
  }),
  row({
    method: "GET",
    path: "/the-game-awards/:year",
    kind: "page",
    group: "tga",
    audience: "public",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Site Pick’em sheet and standings.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/the-game-awards/:year",
    kind: "page",
    group: "tga",
    audience: "member",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Community Pick’em sheet.",
  }),
  row({
    method: "action",
    path: "the-game-awards/actions.ts#saveSiteTgaSheetAction",
    kind: "action",
    group: "tga",
    audience: "member",
    usage: 3,
    dbImpact: 3,
    testPriority: 3,
    loadMix: true,
    notes: "Pick sheet save. Show-night write spike.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/the-game-awards",
    kind: "page",
    group: "tga",
    audience: "member",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Community Pick’em year list.",
  }),
  row({
    method: "GET",
    path: "/communities/:slug/create/the-game-awards",
    kind: "page",
    group: "tga",
    audience: "host",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Host enables a Pick’em year.",
  }),
  row({
    method: "GET+POST",
    path: "/api/auth/[...path]",
    kind: "api",
    group: "auth",
    audience: "public",
    usage: 4,
    dbImpact: 3,
    testPriority: 3,
    notes: "Neon Auth proxy. Sign-in bursts; Auth may 429.",
  }),
  row({
    method: "GET",
    path: "/auth/sign-in",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 4,
    dbImpact: 1,
    testPriority: 2,
    notes: "Sign-in chrome. Work is the Auth API.",
  }),
  row({
    method: "GET",
    path: "/auth/sign-up",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 3,
    dbImpact: 1,
    testPriority: 2,
    notes: "Sign-up chrome.",
  }),
  row({
    method: "GET",
    path: "/auth/forgot-password",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 2,
    dbImpact: 1,
    testPriority: 1,
    notes: "Password help.",
  }),
  row({
    method: "GET",
    path: "/auth/reset-password",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 2,
    dbImpact: 1,
    testPriority: 1,
    notes: "Reset form.",
  }),
  row({
    method: "GET",
    path: "/auth/verify-email",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 2,
    dbImpact: 1,
    testPriority: 1,
    notes: "Verify prompt.",
  }),
  row({
    method: "GET",
    path: "/auth/confirmed",
    kind: "page",
    group: "auth",
    audience: "public",
    usage: 2,
    dbImpact: 2,
    testPriority: 2,
    notes: "Consumes confirm token and sets session.",
  }),
  row({
    method: "GET",
    path: "/auth/complete-profile",
    kind: "page",
    group: "auth",
    audience: "member",
    usage: 3,
    dbImpact: 2,
    testPriority: 2,
    notes: "Google return and handle claim.",
  }),
  row({
    method: "GET",
    path: "/account",
    kind: "page",
    group: "account",
    audience: "member",
    usage: 3,
    dbImpact: 2,
    testPriority: 2,
    notes: "Profile settings.",
  }),
  row({
    method: "POST",
    path: "/api/account/delete",
    kind: "api",
    group: "account",
    audience: "member",
    usage: 1,
    dbImpact: 3,
    testPriority: 2,
    notes: "Account deletion. Rare, must stay correct.",
  }),
  row({
    method: "GET",
    path: "/about",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 2,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/about/lists",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 2,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/about/library",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/about/people",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/about/communities",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/about/pickem",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Static explainer.",
  }),
  row({
    method: "GET",
    path: "/contact",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Contact.",
  }),
  row({
    method: "GET",
    path: "/terms",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Terms.",
  }),
  row({
    method: "GET",
    path: "/privacy",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Privacy.",
  }),
  row({
    method: "GET",
    path: "/guidelines",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Guidelines.",
  }),
  row({
    method: "GET",
    path: "/design-system",
    kind: "page",
    group: "legal",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Internal visual reference, still a public URL.",
  }),
  row({
    method: "GET",
    path: "/game",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Legacy redirect to /games.",
  }),
  row({
    method: "GET",
    path: "/game/:slug",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Legacy redirect to /games/:slug.",
  }),
  row({
    method: "GET",
    path: "/standings",
    kind: "page",
    group: "live-goty",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Redirect into live GOTY.",
  }),
  row({
    method: "GET",
    path: "/trending",
    kind: "page",
    group: "catalog",
    audience: "public",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Redirect to /games?sort=trending.",
  }),
  row({
    method: "GET",
    path: "/api/og",
    kind: "api",
    group: "system",
    audience: "public",
    usage: 3,
    dbImpact: 2,
    testPriority: 2,
    notes: "Share images. Cached-ish; still a fetch per miss.",
  }),
  row({
    method: "GET+POST",
    path: "/api/cron/edition-freeze",
    kind: "cron",
    group: "system",
    audience: "system",
    usage: 2,
    dbImpact: 5,
    testPriority: 3,
    notes: "Edition freeze. Rare clock, expensive SQL when it runs.",
  }),
  row({
    method: "POST",
    path: "/api/webhooks/neon-auth-email",
    kind: "webhook",
    group: "system",
    audience: "system",
    usage: 3,
    dbImpact: 1,
    testPriority: 2,
    notes: "Auth mail. Not a public browse path.",
  }),
  row({
    method: "POST",
    path: "/api/qa/loadtest",
    kind: "api",
    group: "system",
    audience: "system",
    usage: 1,
    dbImpact: 5,
    testPriority: 2,
    notes: "Staging write harness for lists, library, ballots, Pick’em. Not production.",
  }),
  row({
    method: "GET",
    path: "/dev/nav-guard",
    kind: "page",
    group: "system",
    audience: "admin",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Local navigation fixture.",
  }),
  row({
    method: "GET",
    path: "/admin",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Ops index.",
  }),
  row({
    method: "GET",
    path: "/admin/database",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Table sizes.",
  }),
  row({
    method: "GET",
    path: "/admin/sync",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 4,
    testPriority: 2,
    notes: "Catalog import. Operator-only, heavy when used.",
  }),
  row({
    method: "GET+POST",
    path: "/api/admin/sync",
    kind: "api",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 5,
    testPriority: 2,
    notes: "Catalog sync job.",
  }),
  row({
    method: "GET",
    path: "/admin/webhooks",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "IGDB webhook queue.",
  }),
  row({
    method: "GET",
    path: "/admin/awards",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Site award catalog. SQL-paged list and search.",
  }),
  row({
    method: "GET",
    path: "/admin/awards/new",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Create a site award.",
  }),
  row({
    method: "GET",
    path: "/admin/awards/:id",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Edit one site award.",
  }),
  row({
    method: "action",
    path: "admin/awards/actions.ts#createAwardCategoryAction",
    kind: "action",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Insert a site award row.",
  }),
  row({
    method: "action",
    path: "admin/awards/actions.ts#updateAwardCategoryAction",
    kind: "action",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Update a site award row. Does not change its id.",
  }),
  row({
    method: "GET",
    path: "/admin/rankings",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 4,
    testPriority: 2,
    notes: "Rebuild / refresh live scores.",
  }),
  row({
    method: "GET",
    path: "/admin/scheduled",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 1,
    testPriority: 1,
    notes: "Pause scheduled jobs.",
  }),
  row({
    method: "GET",
    path: "/admin/operators",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 2,
    testPriority: 1,
    notes: "Site operators.",
  }),
  row({
    method: "GET",
    path: "/admin/communities",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 3,
    testPriority: 1,
    notes: "Featured directory and seeds.",
  }),
  row({
    method: "GET",
    path: "/admin/seed",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 5,
    testPriority: 1,
    notes: "Synthetic standings. Staging/QA.",
  }),
  row({
    method: "GET",
    path: "/admin/the-game-awards",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Pick’em year ops. Hot on show night for operators, not readers.",
  }),
  row({
    method: "GET",
    path: "/admin/the-game-awards/:year",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Nominees and schedule.",
  }),
  row({
    method: "GET",
    path: "/admin/the-game-awards/:year/show",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 2,
    dbImpact: 3,
    testPriority: 2,
    notes: "Live show calls.",
  }),
  row({
    method: "GET",
    path: "/admin/the-game-awards/seed",
    kind: "page",
    group: "admin",
    audience: "admin",
    usage: 1,
    dbImpact: 4,
    testPriority: 1,
    notes: "Pick’em sheet seed.",
  }),
];

export function endpointKey(row: SiteEndpoint): string {
  return `${row.method} ${row.path}`;
}

export function compareEndpointsForTest(a: SiteEndpoint, b: SiteEndpoint): number {
  return (
    b.testPriority - a.testPriority ||
    b.usage - a.usage ||
    b.dbImpact - a.dbImpact ||
    a.path.localeCompare(b.path)
  );
}

export function endpointsByTestPriority(): SiteEndpoint[] {
  return [...SITE_ENDPOINTS].sort(compareEndpointsForTest);
}

/** What automated coverage this row has today. */
export function endpointCoverage(row: SiteEndpoint): {
  load: boolean;
  unit: boolean;
  e2e: boolean;
  label: string;
} {
  const load = Boolean(row.loadMix);
  const unit = Boolean(row.unitTests);
  const e2e = Boolean(row.e2eTests);
  const parts: string[] = [];
  if (load) parts.push("Load mix");
  if (unit) parts.push("Unit");
  if (e2e) parts.push("Playwright");
  return {
    load,
    unit,
    e2e,
    label: parts.length > 0 ? parts.join(" · ") : "Not yet",
  };
}

export const TEST_PRIORITY_LABEL: Record<SiteEndpointTestPriority, string> = {
  4: "Test first",
  3: "Should test",
  2: "Cover when touched",
  1: "Smoke / docs",
};

export const GROUP_LABEL: Record<SiteEndpointGroup, string> = {
  home: "Home",
  catalog: "Games catalog",
  lists: "Lists and library",
  "live-goty": "Site Game of the Year",
  people: "People",
  communities: "Communities",
  tga: "Video Game Awards Pick’em",
  auth: "Sign-in",
  account: "Account",
  legal: "About and legal",
  admin: "Ops",
  system: "System",
};
