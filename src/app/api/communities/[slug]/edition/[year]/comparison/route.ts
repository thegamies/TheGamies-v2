import { NextResponse } from "next/server";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  ensurePublishedEditionResults,
  getEditionComparisonBundle,
} from "@/lib/communities/edition-results";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { getCommunityBySlug } from "@/lib/communities/service";

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

    const user = await getRequestSessionUser();
    const profile = user
      ? await getRequestProfileByAuthUserId(user.id)
      : null;

    const data = await getEditionComparisonBundle(edition.id, {
      viewerProfileId: profile?.id ?? null,
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
