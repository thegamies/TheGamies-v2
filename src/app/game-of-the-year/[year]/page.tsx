import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveStandingsView } from "@/components/live-aggregate/LiveStandingsView";
import {
  STANDINGS_PAGE_SIZE,
  getStandingsPage,
} from "@/lib/live-aggregate/service";
import {
  DEFAULT_LIVE_STANDINGS_VIEW,
  DEFAULT_STANDINGS_CATEGORY_GROUP,
  parseLiveStandingsView,
  parseStandingsCategoryGroup,
} from "@/lib/live-aggregate/award-category-defs";

type Params = Promise<{ year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) return { title: "Game of the Year" };
  return {
    title: `${Math.floor(year)} Game of the Year`,
    description: `Live Game of the Year standings for ${Math.floor(year)}.`,
  };
}

export default async function GameOfTheYearYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    notFound();
  }
  const y = Math.floor(year);
  const sp = await searchParams;
  const pageRaw = Number(first(sp.page) ?? "1");
  const requestedPage =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const categoryGroup = parseStandingsCategoryGroup(first(sp.group));
  const view = parseLiveStandingsView(first(sp.view));
  const categoryId = first(sp.category) ?? null;

  const current = new Date().getUTCFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => current - i);

  let page;
  try {
    page = await getStandingsPage(y, {
      page: requestedPage,
      pageSize: STANDINGS_PAGE_SIZE,
      categoryGroup,
      view,
      categoryId,
    });
  } catch {
    page = {
      year: y,
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
      view: DEFAULT_LIVE_STANDINGS_VIEW,
      categoryId: null,
      categoryGameTotal: 0,
    };
  }

  return <LiveStandingsView page={page} yearOptions={yearOptions} />;
}
