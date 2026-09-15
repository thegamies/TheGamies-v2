import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteGotyCategoriesPath } from "@/lib/live-aggregate/award-category-defs";
import { ogImagePath } from "@/lib/seo/og-path";
import { publicPageMetadata } from "@/lib/seo/site";
import {
  SiteGotyYearView,
  firstSearchParam,
  parseSiteGotyYearParam,
} from "../SiteGotyYearView";

type Params = Promise<{ year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) return { title: "Categories" };
  const y = Math.floor(year);
  return publicPageMetadata({
    title: `${y} Categories`,
    description: `Live award category standings for ${y}.`,
    path: siteGotyCategoriesPath(y),
    image: ogImagePath({ kind: "goty", year: y }),
  });
}

export default async function GameOfTheYearCategoriesPage({
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
  const categoryId = firstSearchParam(sp.category) ?? null;
  const view = categoryId ? "category" : "categories";

  return (
    <SiteGotyYearView
      year={year}
      searchParams={sp}
      view={view}
      categoryId={categoryId}
    />
  );
}
