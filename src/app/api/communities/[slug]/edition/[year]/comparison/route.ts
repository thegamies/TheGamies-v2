import { NextResponse } from "next/server";
import { loadBrowsablePublishedEdition } from "@/lib/communities/edition-api-access";
import {
  ensurePublishedEditionResults,
  getEditionComparisonBundle,
} from "@/lib/communities/edition-results";

type Params = Promise<{ slug: string; year: string }>;

export async function GET(
  _request: Request,
  context: { params: Params },
) {
  const { slug, year: yearRaw } = await context.params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  try {
    const access = await loadBrowsablePublishedEdition(slug, Math.floor(year));
    if (!access) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const { community, edition, viewerProfileId } = access;

    await ensurePublishedEditionResults(community.id, edition.year);

    const data = await getEditionComparisonBundle(edition.id, {
      viewerProfileId,
      rankMode: edition.rankMode,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not load comparison." },
      { status: 500 },
    );
  }
}
