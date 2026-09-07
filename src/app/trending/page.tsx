import { redirect } from "next/navigation";
import { parseTrendingScope, trendingHref } from "@/lib/activity/paths";
import { parseTrendingWindowHours } from "@/lib/activity/trending";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TrendingRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  redirect(
    trendingHref({
      hours: parseTrendingWindowHours(first(sp.hours)),
      scope: parseTrendingScope(first(sp.scope)),
    }),
  );
}
