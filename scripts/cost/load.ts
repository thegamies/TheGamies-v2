/**
 * Staging load runner. Never production. See docs/request-cost.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "@thegamies/db";
import { costWarmupHits } from "@/lib/request-cost/warmup";
import {
  parseLoadArgs,
  refuseLoadAppUrl,
} from "@/lib/request-cost/load-cli";
import {
  buildLoadGets,
  buildLoadWrites,
  pickWeighted,
  type LoadWriteOp,
} from "@/lib/request-cost/load-mix";
import { formatLoadHtmlReport } from "@/lib/request-cost/load-html-report";
import {
  formatLoadReport,
  readLoadCostHeaders,
  type LoadSample,
} from "@/lib/request-cost/load-report";
import {
  ensureLoadSessionCookie,
  type LoadCookieSlot,
} from "@/lib/request-cost/load-session";
import {
  assertLoadtestFixturesSafe,
  LOADTEST_BALLOT_ITEM_COUNT,
  LOADTEST_EDITION_FILLING_YEAR,
  LOADTEST_LIST_ITEM_COUNT,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  loadtestBallotGames,
  loadtestWriteGames,
  pickLoadtestGame,
  pickLoadtestGames,
  type LoadtestFixturesFile,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  repairLoadtestOpenEdition,
  repairLoadtestTgaYear,
} from "@/lib/qa/loadtest-repair";
import { loadtestSecretFromEnv } from "@/lib/qa/loadtest-guard";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";

type CookieFile = { writers: Array<{ index: number; cookie: string }> };

function stampUtc(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

function writeBody(
  op: LoadWriteOp,
  fixtures: LoadtestFixturesFile,
): unknown {
  if (op === "list") {
    const items = pickLoadtestGames(
      loadtestWriteGames(fixtures),
      LOADTEST_LIST_ITEM_COUNT,
    ).map((game, rank) => ({ igdbId: game.igdbId, rank: rank + 1 }));
    return {
      op,
      draft: {
        listType: "custom",
        title: "Load test list",
        items:
          items.length > 0
            ? items
            : [{ igdbId: fixtures.game.igdbId, rank: 1 }],
      },
    };
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
    year: fixtures.tgaOpenYear,
    worldPremieresGuess: 3,
    picks: fixtures.tgaOpenPicks,
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
  await repairLoadtestTgaYear(db, {
    year: LOADTEST_TGA_OPEN_YEAR,
    phase: "open",
    communityId: fixtures.communityId,
    gameId: fixtures.game.id,
  });
  await repairLoadtestTgaYear(db, {
    year: LOADTEST_TGA_LOCKED_YEAR,
    phase: "locked",
    communityId: fixtures.communityId,
    gameId: fixtures.game.id,
  });
}

async function runScenario(input: {
  scenario: LoadtestScenario;
  appUrl: string;
  durationMs: number;
  vusRead: number;
  writers: number;
  fixtures: LoadtestFixturesFile;
  cookies: string[];
  secret: string | null;
  tag: string;
}): Promise<string> {
  const gets = buildLoadGets(input.scenario, input.fixtures);
  const writes = buildLoadWrites(input.scenario);
  await warmup(input.appUrl, gets[0]!.path);

  const samples: LoadSample[] = [];
  const started = new Date();
  const end = started.getTime() + input.durationMs;
  const journey = `${input.tag}-${input.scenario}`;

  const readers = Array.from({ length: input.vusRead }, async () => {
    while (Date.now() < end) {
      const item = pickWeighted(gets);
      const path = item.pickGame
        ? `/games/${encodeURIComponent(pickLoadtestGame(loadtestWriteGames(input.fixtures)).slug)}`
        : item.path;
      const t0 = Date.now();
      try {
        const res = await fetch(`${input.appUrl}${path}`, {
          headers: {
            accept: "text/html",
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
          ...readLoadCostHeaders(res.headers),
        });
      } catch {
        samples.push({
          group: item.group,
          step: path,
          status: 0,
          ms: Date.now() - t0,
          ok: false,
        });
      }
    }
  });

  const cookieSlots: LoadCookieSlot[] = input.cookies.map((cookie) => ({
    cookie,
    refreshedAt: 0,
    inflight: null,
  }));

  const writerLoops = Array.from({ length: input.writers }, async (_, i) => {
    const slot = cookieSlots[i % Math.max(cookieSlots.length, 1)];
    if (!slot?.cookie || !input.secret || writes.length === 0) return;

    const postWrite = (op: LoadWriteOp) =>
      fetch(`${input.appUrl}/api/qa/loadtest`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${input.secret}`,
          cookie: slot.cookie,
          "x-cost-journey": journey,
          "x-cost-step": op,
        },
        body: JSON.stringify(writeBody(op, input.fixtures)),
      });

    while (Date.now() < end) {
      const item = pickWeighted(writes);
      await ensureLoadSessionCookie(slot, input.appUrl, Date.now(), false);
      const t0 = Date.now();
      try {
        let res = await postWrite(item.op);
        await res.arrayBuffer().catch(() => null);
        if (res.status === 401) {
          await ensureLoadSessionCookie(slot, input.appUrl, Date.now(), true);
          res = await postWrite(item.op);
          await res.arrayBuffer().catch(() => null);
        }
        samples.push({
          group: item.group,
          step: item.op,
          status: res.status,
          ms: Date.now() - t0,
          ok: res.ok,
          ...readLoadCostHeaders(res.headers),
        });
      } catch {
        samples.push({
          group: item.group,
          step: item.op,
          status: 0,
          ms: Date.now() - t0,
          ok: false,
        });
      }
    }
  });

  await Promise.all([...readers, ...writerLoops]);
  const ended = new Date();
  const stats = {
    scenario: input.scenario,
    durationMs: ended.getTime() - started.getTime(),
    vusRead: input.vusRead,
    writers: input.writers,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    samples,
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

  if (process.env.COST_LOAD_SKIP_REPAIR === "1") {
    console.log("cost-load: skipping phase repair");
  } else {
    await repairPhases(fixtures, target.databaseUrl);
  }
  const tag = process.env.COST_RUN_TAG?.trim() || `load-${Date.now()}`;

  for (const scenario of args.scenarios) {
    await runScenario({
      scenario,
      appUrl: target.appUrl,
      durationMs: args.durationMs,
      vusRead: args.vusRead,
      writers: args.writers,
      fixtures,
      cookies: cookies.slice(0, args.writers),
      secret,
      tag,
    });
  }
}

main().catch((error: unknown) => {
  console.error(
    `cost-load: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
