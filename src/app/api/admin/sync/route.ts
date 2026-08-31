import { NextResponse } from "next/server";
import { createDb } from "@thegamies/db";
import {
  ALL_ENRICH_ENTITIES,
  CATALOG_ENTITY_ORDER,
  getBackfillResumeInfo,
  getWalkResume,
  isCatalogEntity,
  listRecentSyncRuns,
  runBackfillSync,
  runCatalogSync,
  runEnrich,
  runImportYear,
  runIncrementalSync,
  runUpdatedSync,
  type CatalogEntityOrAll,
  type EnrichEntity,
} from "@thegamies/igdb";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { adminSyncBodySchema } from "@/lib/admin-sync-schema";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseCatalogEntity(
  entity: string | undefined,
): CatalogEntityOrAll {
  if (entity == null || entity === "all") return "all";
  if (!isCatalogEntity(entity)) {
    throw new Error("Unknown catalog entity");
  }
  return entity;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminSyncBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = createDb();
  const {
    action,
    year,
    afterId,
    maxPages,
    entity,
    sinceUnix,
    reset,
  } = parsed.data;

  try {
    if (action === "status") {
      const runs = await listRecentSyncRuns(db, 40);
      const resume = await getBackfillResumeInfo(db, { year });
      const walkEntity = parseCatalogEntity(entity);
      const catalogResume = await getWalkResume(db, "catalog", walkEntity);
      const updatedResume = await getWalkResume(db, "updated", walkEntity);
      return NextResponse.json({
        runs,
        resume,
        catalogResume,
        updatedResume,
      });
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

    if (action === "catalog") {
      const result = await runCatalogSync(db, {
        entity: parseCatalogEntity(entity),
        afterId,
        maxPages: maxPages ?? 1,
        reset,
      });
      return NextResponse.json(result);
    }

    if (action === "updated") {
      const result = await runUpdatedSync(db, {
        entity: parseCatalogEntity(entity),
        afterId,
        maxPages: maxPages ?? 1,
        sinceUnix,
        reset,
      });
      return NextResponse.json(result);
    }

    if (action === "enrich") {
      if (!entity) {
        return NextResponse.json(
          { error: "entity required for enrich" },
          { status: 400 },
        );
      }
      if (entity === "games") {
        return NextResponse.json(
          { error: "Enrich does not apply to games" },
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
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createDb();
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year =
    yearParam != null && yearParam !== "" ? Number(yearParam) : undefined;
  const entityParam = url.searchParams.get("entity") ?? "all";
  const runs = await listRecentSyncRuns(db, 40);
  const resume = await getBackfillResumeInfo(
    db,
    Number.isFinite(year) ? { year } : {},
  );
  const walkEntity =
    entityParam === "all" || isCatalogEntity(entityParam)
      ? entityParam
      : "all";
  const catalogResume = await getWalkResume(db, "catalog", walkEntity);
  const updatedResume = await getWalkResume(db, "updated", walkEntity);
  return NextResponse.json({
    runs,
    resume,
    catalogResume,
    updatedResume,
    catalogEntities: CATALOG_ENTITY_ORDER,
  });
}
