import type { Db } from "@thegamies/db";
import {
  CATALOG_ENTITY_ORDER,
  catalogRunKind,
  isCatalogEntity,
  nextCatalogEntity,
  type CatalogEntity,
} from "./catalog-entities";
import {
  evaluateEntityResume,
  type EntityResumeRow,
} from "./entity-resume";
import {
  runEntityWalk,
  type EntityWalkProgress,
  type EntityWalkResult,
} from "./entity-walker";
import {
  DEFAULT_LOOKBACK_SECONDS,
  OVERHANG_SECONDS,
} from "./sync-constants";
import {
  finishSyncRun,
  getLastSuccessfulSyncDateByKinds,
  getLatestSyncRun,
  startSyncRun,
  updateSyncRun,
} from "./sync-runs";

export type WalkMode = "catalog" | "updated";
export type CatalogEntityOrAll = CatalogEntity | "all";

export type WalkResumeInfo = {
  afterId: number;
  canContinue: boolean;
  entity: CatalogEntityOrAll;
  currentEntity: CatalogEntity | null;
  completed: CatalogEntity[];
  sinceUnix: number | null;
};

export type EntityWalkSyncResult = EntityWalkResult & {
  allDone: boolean;
  nextEntity: CatalogEntity | null;
  completed: CatalogEntity[];
  currentEntity: CatalogEntity;
};

type AllRunScope = {
  mode: WalkMode;
  completed: CatalogEntity[];
  currentEntity: CatalogEntity;
  sinceUnix: number | null;
};

function asCatalogEntityList(value: unknown): CatalogEntity[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CatalogEntity =>
    typeof item === "string" && isCatalogEntity(item),
  );
}

function rowToResume(
  row: {
    status: string;
    pages: number;
    lastIgdbId: number | null;
    scope: unknown;
  } | null,
): EntityResumeRow | null {
  if (!row) return null;
  return {
    status: row.status,
    pages: row.pages,
    lastIgdbId: row.lastIgdbId,
    scope: row.scope as EntityResumeRow["scope"],
  };
}

export function parseAllRunScope(
  scope: Record<string, unknown> | null | undefined,
  mode: WalkMode,
): AllRunScope | null {
  if (!scope) return null;
  const current =
    typeof scope.currentEntity === "string" && isCatalogEntity(scope.currentEntity)
      ? scope.currentEntity
      : nextCatalogEntity(asCatalogEntityList(scope.completed));
  if (!current) return null;
  return {
    mode,
    completed: asCatalogEntityList(scope.completed),
    currentEntity: current,
    sinceUnix:
      typeof scope.sinceUnix === "number" ? scope.sinceUnix : null,
  };
}

async function resolveUpdatedSinceUnix(
  db: Db,
  entity: CatalogEntity,
  explicit?: number,
): Promise<number> {
  if (explicit != null) return explicit;
  const kinds =
    entity === "games"
      ? [catalogRunKind("updated", "games"), "incremental"]
      : [catalogRunKind("updated", entity)];
  const lastSuccess = await getLastSuccessfulSyncDateByKinds(db, kinds);
  const nowUnix = Math.floor(Date.now() / 1000);
  if (!lastSuccess) return nowUnix - DEFAULT_LOOKBACK_SECONDS;
  return Math.floor(lastSuccess.getTime() / 1000) - OVERHANG_SECONDS;
}

export function parseSinceUnix(raw: string): number {
  if (/^\d+$/.test(raw)) return Number(raw);
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --since value: ${raw}`);
  }
  return Math.floor(parsed / 1000);
}

export async function getEntityWalkResume(
  db: Db,
  mode: WalkMode,
  entity: CatalogEntity,
): Promise<WalkResumeInfo> {
  const row = await getLatestSyncRun(db, catalogRunKind(mode, entity));
  const resume = evaluateEntityResume(rowToResume(row));
  return {
    afterId: resume.afterId,
    canContinue: resume.canContinue,
    entity,
    currentEntity: entity,
    completed: [],
    sinceUnix: resume.sinceUnix,
  };
}

export async function getAllWalkResume(
  db: Db,
  mode: WalkMode,
): Promise<WalkResumeInfo> {
  const row = await getLatestSyncRun(db, catalogRunKind(mode, "all"));
  const parsed = parseAllRunScope(
    row?.scope as Record<string, unknown> | null,
    mode,
  );
  const resume = evaluateEntityResume(rowToResume(row));

  if (!row || !parsed) {
    return {
      afterId: 0,
      canContinue: false,
      entity: "all",
      currentEntity: CATALOG_ENTITY_ORDER[0],
      completed: [],
      sinceUnix: resume.sinceUnix,
    };
  }

  const entityResume = await getEntityWalkResume(db, mode, parsed.currentEntity);
  const canContinue =
    row.status === "running" ||
    row.status === "error" ||
    entityResume.canContinue;

  return {
    afterId: entityResume.canContinue ? entityResume.afterId : 0,
    canContinue,
    entity: "all",
    currentEntity: parsed.currentEntity,
    completed: parsed.completed,
    sinceUnix: parsed.sinceUnix ?? resume.sinceUnix ?? entityResume.sinceUnix,
  };
}

export async function getWalkResume(
  db: Db,
  mode: WalkMode,
  entity: CatalogEntityOrAll,
): Promise<WalkResumeInfo> {
  if (entity === "all") return getAllWalkResume(db, mode);
  return getEntityWalkResume(db, mode, entity);
}

async function getOrStartAllRun(
  db: Db,
  mode: WalkMode,
  options: { reset?: boolean; sinceUnix?: number | null },
): Promise<{
  id: string;
  scope: AllRunScope;
}> {
  if (!options.reset) {
    const existing = await getLatestSyncRun(db, catalogRunKind(mode, "all"));
    const parsed = parseAllRunScope(
      existing?.scope as Record<string, unknown> | null,
      mode,
    );
    const unfinished =
      existing &&
      parsed &&
      (existing.status === "running" || existing.status === "error");
    if (existing && parsed && unfinished) {
      return { id: existing.id, scope: parsed };
    }
  }

  const sinceUnix = options.sinceUnix ?? null;
  const currentEntity = CATALOG_ENTITY_ORDER[0];
  const scope: AllRunScope = {
    mode,
    completed: [],
    currentEntity,
    sinceUnix,
  };
  const id = await startSyncRun(db, catalogRunKind(mode, "all"), {
    ...scope,
    truncated: true,
  });
  return { id, scope };
}

export async function runCatalogSync(
  db: Db,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  } = {},
): Promise<EntityWalkSyncResult> {
  return runWalkSync(db, "catalog", options);
}

export async function runUpdatedSync(
  db: Db,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  } = {},
): Promise<EntityWalkSyncResult> {
  return runWalkSync(db, "updated", options);
}

async function runWalkSync(
  db: Db,
  mode: WalkMode,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  },
): Promise<EntityWalkSyncResult> {
  const entity = options.entity ?? "all";
  if (entity !== "all") {
    const resume = await getEntityWalkResume(db, mode, entity);
    const sinceUnix =
      mode === "updated"
        ? (options.sinceUnix ??
          resume.sinceUnix ??
          (await resolveUpdatedSinceUnix(db, entity)))
        : undefined;
    const afterId = options.reset
      ? 0
      : (options.afterId ?? (resume.canContinue ? resume.afterId : 0));
    const result = await runEntityWalk(db, {
      mode,
      entity,
      afterId,
      maxPages: options.maxPages,
      sinceUnix,
      onPage: options.onPage,
    });
    return {
      ...result,
      allDone: !result.truncated,
      nextEntity: null,
      completed: result.truncated ? [] : [entity],
      currentEntity: entity,
    };
  }

  return runAllWalkChunk(db, mode, options);
}

async function runAllWalkChunk(
  db: Db,
  mode: WalkMode,
  options: {
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  },
): Promise<EntityWalkSyncResult> {
  const reset = options.reset === true;
  let sinceUnix = options.sinceUnix ?? null;
  if (mode === "updated" && sinceUnix == null && !reset) {
    const allResume = await getAllWalkResume(db, mode);
    sinceUnix = allResume.sinceUnix;
  }
  if (mode === "updated" && sinceUnix == null) {
    sinceUnix = await resolveUpdatedSinceUnix(db, "games", options.sinceUnix);
  }

  const allRun = await getOrStartAllRun(db, mode, { reset, sinceUnix });
  const currentEntity = allRun.scope.currentEntity;
  const entityResume = await getEntityWalkResume(db, mode, currentEntity);
  const afterId =
    options.afterId != null && !reset
      ? options.afterId
      : reset
        ? 0
        : entityResume.canContinue
          ? entityResume.afterId
          : 0;

  let result: EntityWalkResult;
  try {
    result = await runEntityWalk(db, {
      mode,
      entity: currentEntity,
      afterId,
      maxPages: options.maxPages,
      sinceUnix: allRun.scope.sinceUnix ?? sinceUnix ?? undefined,
      onPage: options.onPage,
    });
  } catch (error) {
    await finishSyncRun(db, allRun.id, {
      status: "error",
      lastIgdbId: afterId || null,
      error: error instanceof Error ? error.message : String(error),
      scope: {
        mode,
        completed: allRun.scope.completed,
        currentEntity,
        sinceUnix: allRun.scope.sinceUnix ?? sinceUnix,
        truncated: true,
      },
    });
    throw error;
  }

  let completed = allRun.scope.completed;
  let nextEntity: CatalogEntity | null = currentEntity;
  let allDone = false;

  if (!result.truncated) {
    completed = [...completed, currentEntity];
    nextEntity = nextCatalogEntity(completed);
    if (!nextEntity) {
      allDone = true;
      await finishSyncRun(db, allRun.id, {
        status: "success",
        rowsProcessed: result.synced,
        pages: result.pages,
        lastIgdbId: result.lastId,
        scope: {
          mode,
          completed,
          currentEntity,
          sinceUnix: allRun.scope.sinceUnix ?? sinceUnix,
          truncated: false,
        },
      });
    } else {
      await updateSyncRun(db, allRun.id, {
        rowsProcessed: result.synced,
        pages: result.pages,
        lastIgdbId: result.lastId,
        scope: {
          mode,
          completed,
          currentEntity: nextEntity,
          sinceUnix: allRun.scope.sinceUnix ?? sinceUnix,
          truncated: true,
        },
      });
    }
  } else {
    await updateSyncRun(db, allRun.id, {
      rowsProcessed: result.synced,
      pages: result.pages,
      lastIgdbId: result.lastId,
      scope: {
        mode,
        completed,
        currentEntity,
        sinceUnix: allRun.scope.sinceUnix ?? sinceUnix,
        truncated: true,
      },
    });
  }

  return {
    ...result,
    allDone,
    nextEntity: allDone ? null : nextEntity,
    completed,
    currentEntity,
  };
}

export async function runCatalogUntilComplete(
  db: Db,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    reset?: boolean;
    sinceUnix?: number;
    onPage?: (progress: EntityWalkProgress) => void;
  } = {},
): Promise<EntityWalkSyncResult[]> {
  return runUntilComplete(db, "catalog", options);
}

export async function runUpdatedUntilComplete(
  db: Db,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  } = {},
): Promise<EntityWalkSyncResult[]> {
  return runUntilComplete(db, "updated", options);
}

async function runUntilComplete(
  db: Db,
  mode: WalkMode,
  options: {
    entity?: CatalogEntityOrAll;
    afterId?: number;
    maxPages?: number;
    sinceUnix?: number;
    reset?: boolean;
    onPage?: (progress: EntityWalkProgress) => void;
  },
): Promise<EntityWalkSyncResult[]> {
  const out: EntityWalkSyncResult[] = [];
  let afterId = options.afterId;
  let reset = options.reset;
  for (;;) {
    const chunk = await runWalkSync(db, mode, {
      ...options,
      afterId,
      reset,
    });
    out.push(chunk);
    afterId = undefined;
    reset = false;
    if (options.maxPages != null) break;
    if (chunk.allDone) break;
  }
  return out;
}
