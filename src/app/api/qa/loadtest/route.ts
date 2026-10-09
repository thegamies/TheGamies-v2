import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { upsertEditionBallot } from "@/lib/communities/ballots";
import { saveOwnedListFromClientDraft } from "@/lib/lists/service";
import { setLibraryStatus } from "@/lib/library/service";
import { parseLibraryStatus } from "@/lib/activity/kinds";
import { saveCommunitySheet } from "@/lib/tga-pickem/sheets";
import { getCommunityBySlug } from "@/lib/communities/service";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_TGA_OPEN_YEAR,
} from "@/lib/qa/loadtest";
import {
  authorizeLoadtestRequest,
  loadtestBodyTooLarge,
} from "@/lib/qa/loadtest-guard";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";

export const runtime = "nodejs";

const listOp = z.object({
  op: z.literal("list"),
  draft: z.unknown(),
});

const libraryOp = z.object({
  op: z.literal("library"),
  gameId: z.string().min(1).max(80),
  gameSlug: z.string().min(1).max(160),
  status: z.string().min(1).max(32),
});

const ballotOp = z.object({
  op: z.literal("ballot"),
  slug: z.string().min(1).max(64),
  year: z.number().int(),
  items: z.unknown(),
  categoryVotes: z.unknown().optional(),
  customCategoryVotes: z.unknown().optional(),
});

const pickemOp = z.object({
  op: z.literal("pickem"),
  slug: z.string().min(1).max(64),
  year: z.number().int(),
  worldPremieresGuess: z.number().int(),
  picks: z.record(z.string(), z.string()),
});

const bodySchema = z.discriminatedUnion("op", [
  listOp,
  libraryOp,
  ballotOp,
  pickemOp,
]);

function refuseSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (normalized === QA_COMMUNITIES.showcase.slug) {
    return "Refusing the QA showcase community.";
  }
  if (normalized !== LOADTEST_COMMUNITY.slug) {
    return "Refusing a community that is not the load-test community.";
  }
  return null;
}

export async function POST(request: Request) {
  const gate = authorizeLoadtestRequest(request);
  if (!("ok" in gate)) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (loadtestBodyTooLarge(request.headers.get("content-length"))) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const user = await getRequestSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const profile = await getRequestProfileByAuthUserId(user.id).catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Profile required." }, { status: 401 });
  }

  const body = parsed.data;
  if (body.op === "list") {
    const result = await saveOwnedListFromClientDraft(body.draft, {
      profileId: profile.id,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.op === "library") {
    const status = parseLibraryStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "Choose a library status." }, { status: 400 });
    }
    await setLibraryStatus(profile.id, body.gameId, { status });
    return NextResponse.json({ ok: true });
  }

  const slugError = refuseSlug(body.slug);
  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 });
  }

  if (body.op === "ballot") {
    const result = await upsertEditionBallot({
      slug: body.slug,
      year: body.year,
      profileId: profile.id,
      items: body.items,
      categoryVotes: body.categoryVotes ?? [],
      customCategoryVotes: body.customCategoryVotes ?? [],
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.year !== LOADTEST_TGA_OPEN_YEAR) {
    return NextResponse.json(
      { error: "Pick’em writes only use the load-test open year." },
      { status: 400 },
    );
  }
  const community = await getCommunityBySlug(body.slug, profile.id);
  if (!community) {
    return NextResponse.json({ error: "Community not found." }, { status: 404 });
  }
  const result = await saveCommunitySheet(community.id, profile.id, body.year, {
    worldPremieresGuess: body.worldPremieresGuess,
    picks: body.picks,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
