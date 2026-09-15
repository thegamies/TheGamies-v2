import { LiveStandingsView } from "@/components/live-aggregate/LiveStandingsView";
import { yearsForStandingsSwitcher } from "@/lib/live-aggregate/public-board";
import {
  STANDINGS_PAGE_SIZE,
  getStandingsPage,
  listPublicStandingsYears,
} from "@/lib/live-aggregate/service";
import {
  DEFAULT_STANDINGS_CATEGORY_GROUP,
  parseStandingsCategoryGroup,
  type LiveStandingsViewId,
} from "@/lib/live-aggregate/award-category-defs";
import { gotyCreatorCta } from "@/lib/lists/existing-goty";
import { loadGotyCreatorCtas } from "@/lib/lists/load-goty-creator-cta";

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSiteGotyYearParam(yearRaw: string): number | null {
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;
  return Math.floor(year);
}

export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return first(value);
}

export async function SiteGotyYearView({
  year,
  searchParams,
  view,
  categoryId,
}: {
  year: number;
  searchParams: Search;
  view: LiveStandingsViewId;
  categoryId?: string | null;
}) {
  const pageRaw = Number(first(searchParams.page) ?? "1");
  const requestedPage =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const categoryGroup = parseStandingsCategoryGroup(first(searchParams.group));

  const [page, publicYears, creatorCtas] = await Promise.all([
    getStandingsPage(year, {
      page: requestedPage,
      pageSize: STANDINGS_PAGE_SIZE,
      categoryGroup,
      view,
      categoryId: categoryId ?? null,
    }).catch(() => ({
      year,
      listCount: 0,
      detailedStatsRevealed: false,
      standingsVersion: 0,
      scoresFresh: true,
      page: 1,
      pageSize: STANDINGS_PAGE_SIZE,
      gotyTotal: 0,
      totalPages: 1,
      goty: [],
      categories: [],
      categoryGroup: DEFAULT_STANDINGS_CATEGORY_GROUP,
      view,
      categoryId: categoryId ?? null,
      categoryGameTotal: 0,
      gotyPublic: false,
      categoriesPublic: false,
    })),
    listPublicStandingsYears().catch(() => [] as number[]),
    loadGotyCreatorCtas([year]).catch(() => new Map()),
  ]);

  const creatorCta = creatorCtas.get(year) ?? gotyCreatorCta(year, null);
  const yearOptions = yearsForStandingsSwitcher(publicYears, year);

  return (
    <LiveStandingsView
      page={page}
      yearOptions={yearOptions}
      creatorCta={creatorCta}
    />
  );
}
