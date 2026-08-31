#!/usr/bin/env node
import { createDb } from "@thegamies/db";
import {
  CATALOG_ENTITY_ORDER,
  isCatalogEntity,
  type CatalogEntity,
} from "./catalog-entities";
import {
  getWalkResume,
  parseSinceUnix,
  runCatalogUntilComplete,
  runUpdatedUntilComplete,
  type CatalogEntityOrAll,
} from "./catalog-sync";
import { requireDopplerCli } from "./cli-env";
import {
  ALL_ENRICH_ENTITIES,
  getBackfillResumeInfo,
  runBackfillSync,
  runEnrich,
  runImportYear,
  runIncrementalSync,
  type EnrichEntity,
} from "./sync";

function usage() {
  console.log(`Usage:
  pnpm sync:igdb backfill [--year 2026] [--after N] [--max-pages N]
  pnpm sync:igdb incremental [--max-pages N]
  pnpm sync:igdb catalog [--entity games|covers|...|all] [--after N] [--max-pages N]
  pnpm sync:igdb updated [--entity ...] [--since unix|ISO] [--after N] [--max-pages N]
  pnpm sync:igdb enrich <entity|all> [--year 2026]
  pnpm sync:igdb import --year 2026

  Backfill / import auto-resume from the latest unfinished run for that
  year (or full catalog when --year is omitted). Pass --after to override.

  catalog walks each entity from the lowest IGDB id. updated walks rows
  with updated_at >= since (default: last successful updated run).
  Omit --max-pages to run until the entity (or all) is complete.
  Omit --after to resume the latest unfinished walk for that entity.
  --after 0 restarts the id cursor.

  pnpm sync:igdb injects Doppler. Already inside doppler run (for example
  --config dev_personal) is left as-is.

Catalog entities: ${CATALOG_ENTITY_ORDER.join(", ")}
Enrich entities: ${ALL_ENRICH_ENTITIES.join(", ")}
`);
}

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseEntityArg(raw: string | undefined): CatalogEntityOrAll {
  if (raw == null || raw === "all") return "all";
  if (!isCatalogEntity(raw)) {
    console.error(`Unknown entity: ${raw}`);
    process.exit(1);
  }
  return raw;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || hasFlag(args, "--help") || hasFlag(args, "-h")) {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  const dopplerConfig = requireDopplerCli();
  console.log(`Doppler config: ${dopplerConfig}`);

  const db = createDb();
  const yearRaw = argValue(args, "--year");
  const year = yearRaw ? Number(yearRaw) : undefined;
  const afterRaw = argValue(args, "--after");
  const maxPagesRaw = argValue(args, "--max-pages");
  const maxPages = maxPagesRaw ? Number(maxPagesRaw) : undefined;
  const entityRaw = argValue(args, "--entity");
  const sinceRaw = argValue(args, "--since");

  if (cmd === "backfill") {
    let afterId = afterRaw ? Number(afterRaw) : undefined;
    if (afterId == null) {
      const resume = await getBackfillResumeInfo(db, { year });
      if (resume.canContinue) {
        afterId = resume.afterId;
        const scopeLabel = year != null ? `year ${year}` : "full catalog";
        console.log(
          `Resuming ${scopeLabel} backfill after igdb id ${afterId}`,
        );
      }
    }
    const result = await runBackfillSync(db, { year, afterId, maxPages });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "incremental") {
    const result = await runIncrementalSync(db, { maxPages });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "catalog" || cmd === "updated") {
    const entity = parseEntityArg(entityRaw);
    const afterId = afterRaw != null ? Number(afterRaw) : undefined;
    const reset = afterId === 0;
    const sinceUnix = sinceRaw ? parseSinceUnix(sinceRaw) : undefined;
    if (afterId == null) {
      const resume = await getWalkResume(db, cmd, entity);
      if (resume.canContinue) {
        console.log(
          `Resuming ${cmd} ${resume.currentEntity ?? entity} after igdb id ${resume.afterId}`,
        );
      }
    }
    const onPage = (progress: {
      entity: CatalogEntity;
      pages: number;
      lastId: number;
      synced: number;
    }) => {
      console.log(
        `${progress.entity} page ${progress.pages} last id ${progress.lastId} synced ${progress.synced}`,
      );
    };
    const runner =
      cmd === "catalog" ? runCatalogUntilComplete : runUpdatedUntilComplete;
    const results = await runner(db, {
      entity,
      afterId,
      maxPages,
      reset,
      sinceUnix,
      onPage,
    });
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (cmd === "enrich") {
    const entity = args[1] as EnrichEntity | "all" | undefined;
    if (!entity) {
      usage();
      process.exit(1);
    }
    if (entity === "all") {
      const out: Record<string, number> = {};
      for (const e of ALL_ENRICH_ENTITIES) {
        const r = await runEnrich(db, e, { year });
        out[e] = r.fetched;
        console.log(`enrich ${e}: ${r.fetched}`);
      }
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (!ALL_ENRICH_ENTITIES.includes(entity)) {
      console.error(`Unknown entity: ${entity}`);
      process.exit(1);
    }
    const result = await runEnrich(db, entity, { year });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "import") {
    if (year == null || Number.isNaN(year)) {
      console.error("import requires --year");
      process.exit(1);
    }
    const result = await runImportYear(db, year, { maxPages });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
