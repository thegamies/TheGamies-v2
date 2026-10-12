/**
 * Staging load runner. Never production. See docs/request-cost.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "@thegamies/db";
import { costWarmupHits } from "@/lib/request-cost/warmup";
import {
  loadVuStartOffsetMs,
  parseLoadArgs,
  refuseLoadAppUrl,
} from "@/lib/request-cost/load-cli";
import {
  buildLoadGets,
  buildLoadWrites,
  isListWriteOp,
  LOADTEST_PICKEM_LOCK_FRACTION,
  loadShareListPath,
  pickLoadtestGotyCategory,
  pickLoadtestUsername,
  pickWeighted,
  siteGotyCategoryPath,
  type LoadPickemPhase,
  type LoadWriteOp,
} from "@/lib/request-cost/load-mix";
import { loadGamesSearchPath } from "@/lib/request-cost/load-search";
import {
  applyListWriteState,
  emptyWriterListState,
  listDraftForOp,
  listWriteJsonBody,
  listWriteNeedsSeed,
  listWriteStep,
  parseListWritePublicId,
  randomLoadListSize,
  seedListDraft,
  type WriterListState,
} from "@/lib/request-cost/load-list-writes";
import { formatLoadHtmlReport } from "@/lib/request-cost/load-html-report";
import {
  formatLoadReport,
  readLoadCostHeaders,
  type LoadRunStats,
  type LoadSample,
  type PgExecReport,
} from "@/lib/request-cost/load-report";
import {
  diffPgStatSnapshots,
  snapshotPgStatStatementsAt,
  type PgStatSnapshotRow,
} from "@/lib/request-cost/pg-stat-delta";
import {
  ensureLoadSessionCookie,
  type LoadCookieSlot,
} from "@/lib/request-cost/load-session";
import {
  assertLoadtestFixturesSafe,
  LOADTEST_BALLOT_ITEM_COUNT,
  LOADTEST_EDITION_FILLING_YEAR,
  LOADTEST_TGA_YEAR,
  completeLoadtestTgaPicks,
  loadtestBallotGames,
  loadtestTgaSlateFromFixtures,
  loadtestTgaYearFromFixtures,
  loadtestWriteGames,
  pickLoadtestGame,
  pickLoadtestGames,
  pickLoadtestShareList,
  type LoadtestFixturesFile,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  repairLoadtestOpenEdition,
  repairLoadtestTgaYear,
  restoreLoadtestTgaSchedule,
} from "@/lib/qa/loadtest-repair";
import { getTgaYear } from "@/lib/tga-pickem/service";
import { loadtestSecretFromEnv } from "@/lib/qa/loadtest-guard";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";

type CookieFile = { writers: Array<{ index: number; cookie: string }> };

type WriterSlot = LoadCookieSlot & { list: WriterListState };

function stampUtc(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

function writeBody(
  op: LoadWriteOp,
  fixtures: LoadtestFixturesFile,
  writerIndex = 0,
): unknown {
  if (isListWriteOp(op)) {
    throw new Error(`List writes use listWriteJsonBody, not writeBody (${op}).`);
  }
  if (op === "library") {
    const game = pickLoadtestGame(loadtestWriteGames(fixtures));
    return {
      op,
      gameId: game.id,
      gameSlug: game.slug,
      status: "playing",
    };
  }
  if (op === "ballot") {
    const items = pickLoadtestGames(
      loadtestBallotGames(fixtures),
      LOADTEST_BALLOT_ITEM_COUNT,
    ).map((game, rank) => ({ gameId: game.id, rank: rank + 1 }));
    return {
      op,
      slug: fixtures.communitySlug,
      year: fixtures.fillingYear,
      items: items.length > 0 ? items : fixtures.ballotItems,
      categoryVotes: [],
      customCategoryVotes: [],
    };
  }
  return {
    op: "pickem",
    slug: fixtures.communitySlug,
    year: loadtestTgaYearFromFixtures(fixtures),
    worldPremieresGuess: writerIndex % 21,
    picks: completeLoadtestTgaPicks(
      loadtestTgaSlateFromFixtures(fixtures),
      writerIndex,
    ),
  };
}

async function warmup(appUrl: string, pathName: string) {
  const hits = costWarmupHits();
  for (let i = 0; i < hits; i++) {
    await fetch(`${appUrl}${pathName}`, {
      headers: { accept: "text/html" },
    }).catch(() => null);
  }
}

async function repairPhases(fixtures: LoadtestFixturesFile, databaseUrl: string) {
  const db = createDb(databaseUrl);
  await repairLoadtestOpenEdition(db, {
    communityId: fixtures.communityId,
    year: LOADTEST_EDITION_FILLING_YEAR,
  });
}

async function capturePgExec(
  databaseUrl: string,
  before: PgStatSnapshotRow[] | { error: string },
): Promise<PgExecReport> {
  if ("error" in before) return { ok: false, error: before.error };
  const after = await snapshotPgStatStatementsAt(databaseUrl);
  if ("error" in after) return { ok: false, error: after.error };
  return { ok: true, rows: diffPgStatSnapshots(before, after) };
}

async function runScenario(input: {
  scenario: LoadtestScenario;
  appUrl: string;
  databaseUrl: string;
  durationMs: number;
  rampMs: number;
  vusRead: number;
  writers: number;
  fixtures: LoadtestFixturesFile;
  cookies: string[];
  secret: string | null;
  tag: string;
  skipRepair: boolean;
}): Promise<string> {
  const pickemPhaseRef = { phase: "open" as LoadPickemPhase };
  const getsOpen = buildLoadGets(input.scenario, input.fixtures, "open");
  const getsLocked = buildLoadGets(input.scenario, input.fixtures, "locked");
  const writesOpen = buildLoadWrites(input.scenario, "open");
  const writesLocked = buildLoadWrites(input.scenario, "locked");
  const pgBefore = await snapshotPgStatStatementsAt(input.databaseUrl);
  await warmup(input.appUrl, getsOpen[0]!.path);

  const samples: LoadSample[] = [];
  const started = new Date();
  const end = started.getTime() + input.durationMs;
  const rampMs = Math.min(Math.max(0, input.rampMs), input.durationMs);
  const journey = `${input.tag}-${input.scenario}`;
  const lockAt = started.getTime() + input.durationMs * LOADTEST_PICKEM_LOCK_FRACTION;

  let restoreSchedule: { opensAt: Date; showStartsAt: Date } | null = null;
  if (input.scenario === "pickem" && !input.skipRepair) {
    const db = createDb(input.databaseUrl);
    const current = await getTgaYear(LOADTEST_TGA_YEAR, db);
    if (current?.opensAt && current.showStartsAt) {
      restoreSchedule = {
        opensAt: current.opensAt,
        showStartsAt: current.showStartsAt,
      };
    }
    await repairLoadtestTgaYear(db, {
      year: LOADTEST_TGA_YEAR,
      phase: "open",
      communityId: input.fixtures.communityId,
    });
  }

  const readers = Array.from({ length: input.vusRead }, async (_, i) => {
    const delay = loadVuStartOffsetMs(i, input.vusRead, rampMs);
    if (delay > 0) await sleep(delay);
    while (Date.now() < end) {
      const item = pickWeighted(
        pickemPhaseRef.phase === "locked" ? getsLocked : getsOpen,
      );
      const path = item.pickSearch
        ? loadGamesSearchPath(item.pickSearch, input.fixtures)
        : item.pickGame
          ? `/games/${encodeURIComponent(pickLoadtestGame(loadtestWriteGames(input.fixtures)).slug)}`
          : item.pickCategory
            ? siteGotyCategoryPath(pickLoadtestGotyCategory())
            : item.pickProfile
              ? `/u/${pickLoadtestUsername(input.fixtures.writerCount)}`
              : item.pickShare
                ? loadShareListPath(
                    pickLoadtestShareList(input.fixtures.lists ?? []),
                  )
                : item.path;
      const t0 = Date.now();
      try {
        const res = await fetch(`${input.appUrl}${path}`, {
          headers: {
            accept: item.pickSearch === "api" ? "application/json" : "text/html",
            "x-cost-journey": journey,
            "x-cost-step": path,
          },
        });
        await res.arrayBuffer().catch(() => null);
        samples.push({
          group: item.group,
          step: path,
          status: res.status,
          ms: Date.now() - t0,
          ok: res.ok,
          at: Date.now(),
          ...readLoadCostHeaders(res.headers),
        });
      } catch {
        samples.push({
          group: item.group,
          step: path,
          status: 0,
          ms: Date.now() - t0,
          ok: false,
          at: Date.now(),
        });
      }
    }
  });

  const cookieSlots: WriterSlot[] = input.cookies.map((cookie) => ({
    cookie,
    refreshedAt: 0,
    inflight: null,
    list: emptyWriterListState(),
  }));

  const writerLoops = Array.from({ length: input.writers }, async (_, i) => {
    const slot = cookieSlots[i % Math.max(cookieSlots.length, 1)];
    if (!slot?.cookie || !input.secret || writesOpen.length === 0) return;
    const delay = loadVuStartOffsetMs(i, input.writers, rampMs);
    if (delay > 0) await sleep(delay);

    const postWrite = (op: LoadWriteOp, body: unknown, step: string) =>
      fetch(`${input.appUrl}/api/qa/loadtest`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${input.secret}`,
          cookie: slot.cookie,
          "x-cost-journey": journey,
          "x-cost-step": step,
        },
        body: JSON.stringify(body),
      });

    const postOnce = async (op: LoadWriteOp, body: unknown, step: string) => {
      let res = await postWrite(op, body, step);
      let text = await res.text().catch(() => "");
      if (res.status === 401) {
        await ensureLoadSessionCookie(slot, input.appUrl, Date.now(), true);
        res = await postWrite(op, body, step);
        text = await res.text().catch(() => "");
      }
      return { res, text };
    };

    const seedListIfNeeded = async (op: LoadWriteOp, games?: number) => {
      if (!listWriteNeedsSeed(op, slot.list, games)) return true;
      const draft = seedListDraft(op, input.fixtures, Math.random, games);
      const { res, text } = await postOnce(
        "list-create",
        listWriteJsonBody("list-create", draft),
        "list-create",
      );
      if (!res.ok) return false;
      applyListWriteState(slot.list, draft, parseListWritePublicId(text));
      return Boolean(slot.list.publicId);
    };

    while (Date.now() < end) {
      const item = pickWeighted(
        pickemPhaseRef.phase === "locked" ? writesLocked : writesOpen,
      );
      await ensureLoadSessionCookie(slot, input.appUrl, Date.now(), false);
      const games =
        item.op === "list-create" ||
        item.op === "list-edit" ||
        item.op === "list-delete"
          ? randomLoadListSize()
          : undefined;
      const step = games != null ? listWriteStep(item.op, games) : item.op;
      let t0 = Date.now();
      try {
        if (isListWriteOp(item.op) && !(await seedListIfNeeded(item.op, games))) {
          continue;
        }
        const listDraft = isListWriteOp(item.op)
          ? listDraftForOp(item.op, input.fixtures, slot.list, Math.random, games)
          : null;
        const body = isListWriteOp(item.op)
          ? listDraft
            ? listWriteJsonBody(item.op, listDraft)
            : null
          : writeBody(item.op, input.fixtures, i);
        if (!body) continue;
        const recorded =
          item.op === "list-delete" && listDraft
            ? listWriteStep(item.op, slot.list.items.length - listDraft.items.length)
            : item.op === "list-create" || item.op === "list-edit"
              ? listWriteStep(item.op, listDraft?.items.length ?? games ?? 0)
              : step;
        t0 = Date.now();
        const { res, text } = await postOnce(item.op, body, recorded);
        if (listDraft && res.ok) {
          applyListWriteState(slot.list, listDraft, parseListWritePublicId(text));
        }
        samples.push({
          group: item.group,
          step: recorded,
          status: res.status,
          ms: Date.now() - t0,
          ok: res.ok,
          at: Date.now(),
          ...readLoadCostHeaders(res.headers),
        });
      } catch {
        samples.push({
          group: item.group,
          step,
          status: 0,
          ms: Date.now() - t0,
          ok: false,
          at: Date.now(),
        });
      }
    }
  });

  const lockPickem = (async () => {
    if (input.scenario !== "pickem") return;
    const wait = lockAt - Date.now();
    if (wait > 0) await sleep(wait);
    pickemPhaseRef.phase = "locked";
    if (input.skipRepair) return;
    await repairLoadtestTgaYear(createDb(input.databaseUrl), {
      year: LOADTEST_TGA_YEAR,
      phase: "locked",
      communityId: input.fixtures.communityId,
    });
  })();

  try {
    await Promise.all([...readers, ...writerLoops, lockPickem]);
  } finally {
    if (restoreSchedule) {
      await restoreLoadtestTgaSchedule(
        createDb(input.databaseUrl),
        LOADTEST_TGA_YEAR,
        restoreSchedule,
      );
    }
  }
  const ended = new Date();
  const stats: LoadRunStats = {
    scenario: input.scenario,
    durationMs: ended.getTime() - started.getTime(),
    rampMs,
    vusRead: input.vusRead,
    writers: input.writers,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    samples,
    pgExec: await capturePgExec(input.databaseUrl, pgBefore),
  };
  const report = formatLoadReport(stats);
  const html = formatLoadHtmlReport(stats);
  const dir = path.resolve("e2e/.cost");
  await mkdir(dir, { recursive: true });
  const stem = `load-${input.scenario}-${stampUtc(started)}`;
  const file = path.join(dir, `${stem}.md`);
  await writeFile(file, report);
  await writeFile(path.join(dir, `${stem}.json`), JSON.stringify(stats));
  await writeFile(path.join(dir, `${stem}.html`), html);
  console.log(report);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
  console.log(`wrote ${path.relative(process.cwd(), path.join(dir, `${stem}.html`))}`);
  return file;
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  const refused = refuseLoadAppUrl(target.appUrl);
  if (refused) throw new Error(refused);

  const args = parseLoadArgs(process.argv.slice(2));
  if ("error" in args) throw new Error(args.error);

  const fixtureDir = path.resolve("e2e/.auth/loadtest");
  const fixtures = await readJson<LoadtestFixturesFile>(
    path.join(fixtureDir, "fixtures.json"),
  );
  const unsafe = assertLoadtestFixturesSafe(fixtures);
  if (unsafe) throw new Error(unsafe);

  const cookieFile = await readJson<CookieFile>(
    path.join(fixtureDir, "cookies.json"),
  ).catch(() => ({ writers: [] as CookieFile["writers"] }));
  const cookies = cookieFile.writers.map((row) => row.cookie);
  if (args.writers > cookies.length) {
    throw new Error(
      `Need ${args.writers} writer cookies; run pnpm qa:loadtest:ensure -- --writers ${args.writers}`,
    );
  }
  const secret = loadtestSecretFromEnv();
  if (args.writers > 0 && !secret) {
    throw new Error("LOADTEST_SECRET is required when --writers is set.");
  }

  const skipRepair = process.env.COST_LOAD_SKIP_REPAIR === "1";
  if (skipRepair) {
    console.log("cost-load: skipping phase repair");
  } else {
    await repairPhases(fixtures, target.databaseUrl);
  }
  const tag = process.env.COST_RUN_TAG?.trim() || `load-${Date.now()}`;

  for (const scenario of args.scenarios) {
    await runScenario({
      scenario,
      appUrl: target.appUrl,
      databaseUrl: target.databaseUrl,
      durationMs: args.durationMs,
      rampMs: args.rampMs,
      vusRead: args.vusRead,
      writers: args.writers,
      fixtures,
      cookies: cookies.slice(0, args.writers),
      secret,
      tag,
      skipRepair,
    });
  }
}

main().catch((error: unknown) => {
  console.error(
    `cost-load: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
