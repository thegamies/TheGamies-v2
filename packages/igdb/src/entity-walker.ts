import type { Db } from "@thegamies/db";
import {
  catalogEntitySpec,
  catalogRunKind,
  fetchCatalogEntityPage,
  upsertCatalogPage,
  type CatalogEntity,
} from "./catalog-entities";
import { walkTruncated } from "./entity-resume";
import {
  finishSyncRun,
  startSyncRun,
  updateSyncRun,
} from "./sync-runs";

const PAGE_LIMIT = 500;

export type EntityWalkResult = {
  synced: number;
  pages: number;
  lastId: number;
  truncated: boolean;
  runId: string;
  entity: CatalogEntity;
  sinceUnix: number | null;
};

export type EntityWalkProgress = {
  entity: CatalogEntity;
  pages: number;
  lastId: number;
  synced: number;
};

export async function runEntityWalk(
  db: Db,
  options: {
    mode: "catalog" | "updated";
    entity: CatalogEntity;
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    onPage?: (progress: EntityWalkProgress) => void;
  },
): Promise<EntityWalkResult> {
  const afterStart = options.afterId ?? 0;
  const sinceUnix = options.sinceUnix ?? null;
  const spec = catalogEntitySpec(options.entity);
  const runId = await startSyncRun(
    db,
    catalogRunKind(options.mode, options.entity),
    {
      entity: options.entity,
      mode: options.mode,
      afterId: afterStart,
      maxPages: options.maxPages ?? null,
      sinceUnix,
      truncated: false,
      endpoint: spec.endpoint,
    },
  );

  let afterId = afterStart;
  let synced = 0;
  let pages = 0;
  let lastPageFull = false;

  try {
    const pageCap = options.maxPages ?? Number.POSITIVE_INFINITY;
    while (pages < pageCap) {
      const page = await fetchCatalogEntityPage(options.entity, {
        afterId,
        limit: PAGE_LIMIT,
        sinceUnix: sinceUnix ?? undefined,
      });
      if (page.length === 0) {
        lastPageFull = false;
        break;
      }

      synced += await upsertCatalogPage(db, options.entity, page);
      pages += 1;
      afterId = page[page.length - 1].id;
      lastPageFull = page.length >= PAGE_LIMIT;

      await updateSyncRun(db, runId, {
        rowsProcessed: synced,
        pages,
        lastIgdbId: afterId,
      });
      options.onPage?.({
        entity: options.entity,
        pages,
        lastId: afterId,
        synced,
      });

      if (!lastPageFull) break;
    }

    const truncated = walkTruncated(pages, options.maxPages, lastPageFull);
    await finishSyncRun(db, runId, {
      status: "success",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId,
      scope: {
        entity: options.entity,
        mode: options.mode,
        afterId: afterStart,
        maxPages: options.maxPages ?? null,
        sinceUnix,
        truncated,
        endpoint: spec.endpoint,
      },
    });

    return {
      synced,
      pages,
      lastId: afterId,
      truncated,
      runId,
      entity: options.entity,
      sinceUnix,
    };
  } catch (error) {
    await finishSyncRun(db, runId, {
      status: "error",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId || null,
      error: error instanceof Error ? error.message : String(error),
      scope: {
        entity: options.entity,
        mode: options.mode,
        afterId: afterStart,
        maxPages: options.maxPages ?? null,
        sinceUnix,
        truncated: true,
        endpoint: spec.endpoint,
      },
    });
    throw error;
  }
}
