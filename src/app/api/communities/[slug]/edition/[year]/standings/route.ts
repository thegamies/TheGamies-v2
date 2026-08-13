import { NextResponse } from "next/server";
import {
  ensurePublishedEditionResults,
  getEditionGotyPage,
  parseEditionRankMode,
  parseEditionResultMode,
} from "@/lib/communities/edition-results";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { getCommunityBySlug } from "@/lib/communities/service";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";

type Params = Promise<{ slug: string; year: string }>;

export async function GET(
  request: Request,
  context: { params: Params },
) {
  const { slug, year: yearRaw } = await context.params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const url = new URL(request.url);
  const mode = parseEditionResultMode(url.searchParams.get("mode") ?? undefined);
  const rankMode = parseEditionRankMode(
    url.searchParams.get("rank") ?? undefined,
  );
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const afterRaw = Number(url.searchParams.get("afterPlace") ?? "0");
  const afterPlace =
    Number.isFinite(afterRaw) && afterRaw >= 0 ? Math.floor(afterRaw) : 0;

  try {
    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const edition = await getEditionByCommunityYear(
      community.id,
      Math.floor(year),
    );
    if (!edition || edition.status !== "published") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await ensurePublishedEditionResults(community.id, edition.year);
    const data = await getEditionGotyPage(edition.id, mode, {
      page,
      pageSize: STANDINGS_PAGE_SIZE,
      afterPlace,
      rankMode,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not load standings." },
      { status: 500 },
    );
  }
}
