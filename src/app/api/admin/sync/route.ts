import { NextResponse } from "next/server";
import { createDb } from "@thegamies/db";
import {
  ALL_ENRICH_ENTITIES,
  getBackfillResumeInfo,
  listRecentSyncRuns,
  runBackfillSync,
  runEnrich,
  runImportYear,
  runIncrementalSync,
  type EnrichEntity,
} from "@thegamies/igdb";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  action: z.enum([
    "backfill",
    "incremental",
    "enrich",
    "import",
    "status",
  ]),
  year: z.number().int().optional(),
  afterId: z.number().int().optional(),
  maxPages: z.number().int().positive().optional(),
  entity: z
    .enum([
      "covers",
      "platforms",
      "genres",
      "themes",
      "keywords",
      "game_types",
      "involved_companies",
      "companies",
      "ttb",
      "all",
    ])
    .optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = createDb();
  const { action, year, afterId, maxPages, entity } = parsed.data;

  try {
    if (action === "status") {
      const runs = await listRecentSyncRuns(db, 25);
      const resume = await getBackfillResumeInfo(db, { year });
      return NextResponse.json({ runs, resume });
    }

    if (action === "backfill") {
      let cursor = afterId;
      if (cursor == null) {
        const resume = await getBackfillResumeInfo(db, { year });
        if (resume.canContinue) cursor = resume.afterId;
      }
      const result = await runBackfillSync(db, {
        year,
        afterId: cursor,
        maxPages,
      });
      return NextResponse.json(result);
    }

    if (action === "incremental") {
      const result = await runIncrementalSync(db, { maxPages });
      return NextResponse.json(result);
    }

    if (action === "enrich") {
      if (!entity) {
        return NextResponse.json(
          { error: "entity required for enrich" },
          { status: 400 },
        );
      }
      if (entity === "all") {
        const out: Record<string, number> = {};
        for (const e of ALL_ENRICH_ENTITIES) {
          const r = await runEnrich(db, e, { year });
          out[e] = r.fetched;
        }
        return NextResponse.json({ enrich: out });
      }
      const result = await runEnrich(db, entity as EnrichEntity, { year });
      return NextResponse.json(result);
    }

    if (action === "import") {
      if (year == null) {
        return NextResponse.json(
          { error: "year required for import" },
          { status: 400 },
        );
      }
      const result = await runImportYear(db, year, { maxPages });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createDb();
  const yearParam = new URL(request.url).searchParams.get("year");
  const year =
    yearParam != null && yearParam !== "" ? Number(yearParam) : undefined;
  const runs = await listRecentSyncRuns(db, 25);
  const resume = await getBackfillResumeInfo(
    db,
    Number.isFinite(year) ? { year } : {},
  );
  return NextResponse.json({ runs, resume });
}
