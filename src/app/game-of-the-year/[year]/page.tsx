import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  parseLiveStandingsView,
  parseStandingsCategoryGroup,
  siteGotyLegacyViewRedirectPath,
  siteGotyYearPath,
} from "@/lib/live-aggregate/award-category-defs";
import { ogImagePath } from "@/lib/seo/og-path";
import { publicPageMetadata } from "@/lib/seo/site";
import {
  SiteGotyYearView,
  firstSearchParam,
  parseSiteGotyYearParam,
} from "./SiteGotyYearView";

type Params = Promise<{ year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) return { title: "Game of the Year" };
  const y = Math.floor(year);
  return publicPageMetadata({
    title: `${y} Game of the Year`,
    description: `Live Game of the Year standings for ${y}.`,
    path: siteGotyYearPath(y),
    image: ogImagePath({ kind: "goty", year: y }),
  });
}

export default async function GameOfTheYearYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { year: yearRaw } = await params;
  const year = parseSiteGotyYearParam(yearRaw);
  if (year == null) notFound();

  const sp = await searchParams;
  const pageRaw = Number(firstSearchParam(sp.page) ?? "1");
  const requestedPage =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const redirectTo = siteGotyLegacyViewRedirectPath({
    year,
    view: parseLiveStandingsView(firstSearchParam(sp.view)),
    page: requestedPage,
    group: parseStandingsCategoryGroup(firstSearchParam(sp.group)),
    category: firstSearchParam(sp.category) ?? null,
  });
  if (redirectTo) permanentRedirect(redirectTo);

  return <SiteGotyYearView year={year} searchParams={sp} view="goty" />;
}
