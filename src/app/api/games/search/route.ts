import { NextResponse } from "next/server";
import { searchGamesForList } from "@/lib/lists/search-games";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const yearRaw = url.searchParams.get("year");
  const yearNum = yearRaw == null || yearRaw === "" ? undefined : Number(yearRaw);
  const year =
    yearNum != null && Number.isFinite(yearNum) ? Math.floor(yearNum) : undefined;

  const hits = await searchGamesForList({
    q,
    year,
    gotyMode: url.searchParams.get("gotyMode") === "1",
    eligibility: url.searchParams.get("eligibility") ?? undefined,
    allowEditions: url.searchParams.get("allowEditions") === "1",
  });

  return NextResponse.json(hits);
}
