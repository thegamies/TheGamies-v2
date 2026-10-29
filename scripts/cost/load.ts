/**
 * Staging load runner. Never production. See docs/request-cost.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { createDb } from "@thegamies/db";
import { markAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import type { NeonSql } from "@/lib/auth/neon-sql";
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
  authGetSession,
  authPost,
  findAuthUserIdByEmail,
  mergeAuthCookies,
  signInEmailCookie,
} from "@/lib/qa/auth-http";
import {
  assertLoadtestFixturesSafe,
  LOADTEST_BALLOT_ITEM_COUNT,
  LOADTEST_COMMUNITY,
  LOADTEST_EDITION_YEAR,
  LOADTEST_TGA_YEAR,
  completeLoadtestTgaPicks,
  loadtestAccount,
  loadtestBallotGames,
  loadtestSignUpEmail,
  loadtestTgaSlateFromFixtures,
  loadtestTgaYearFromFixtures,
  loadtestWriteGames,
  pickLoadtestGame,
  pickLoadtestGames,
  pickLoadtestShareList,
  LOADTEST_SIGNED_IN_READ_FRACTION,
  type LoadtestFixturesFile,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  repairLoadtestOpenEdition,
  repairLoadtestPublishedEdition,
  repairLoadtestTgaYear,
  restoreLoadtestTgaSchedule,
} from "@/lib/qa/loadtest-repair";
import { publishEditionForSeed } from "@/lib/communities/seed-community";
import { getTgaYear } from "@/lib/tga-pickem/service";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";
import {
  emptyLoadCookieSlot,
  maintainLoadSessionCookie,
  type LoadCookieSlot,
} from "@/lib/request-cost/load-session";

type WriterSlot = { list: WriterListState };

async function resignTrafficSession(input: {
  slot: LoadCookieSlot;
  appUrl: string;
  email: string;
  password: string;
  samples: LoadSample[];
  group: string;
}): Promise<boolean> {
  const t0 = Date.now();
  const signed = await signInEmailCookie(
    { appUrl: input.appUrl },
    { email: input.email, password: input.password },
  );
  input.samples.push({
    group: input.group,
    step: "auth-signin",
    status: signed.ok ? 200 : signed.status,
    ms: Date.now() - t0,
    ok: signed.ok,
    at: Date.now(),
  });
  if (!signed.ok) return false;
  input.slot.cookie = signed.cookie;
  input.slot.refreshedAt = Date.now();
  return true;
}

async function keepTrafficSession(input: {
  slot: LoadCookieSlot;
  appUrl: string;
  email: string;
  password: string;
  samples: LoadSample[];
  group: string;
  force?: boolean;
}): Promise<boolean> {
  if (!input.slot.cookie) {
    return resignTrafficSession(input);
  }
  const result = await maintainLoadSessionCookie(
    input.slot,
    input.appUrl,
    Date.now(),
    input.force === true,
  );
  if (result.action === "skip") return true;
  if (result.action === "refreshed") {
    input.samples.push({
      group: input.group,
      step: "auth-get-session",
      status: 200,
      ms: result.ms,
      ok: true,
      at: Date.now(),
    });
    return true;
  }
  input.samples.push({
    group: input.group,
    step: "auth-get-session",
    status: 401,
    ms: result.ms,
    ok: false,
    at: Date.now(),
  });
  return resignTrafficSession(input);
}

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
    year: LOADTEST_EDITION_YEAR,
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

type AuthOp =
  | "auth-signup"
  | "auth-signin"
  | "auth-get-session"
  | "auth-read";

const AUTH_OPS: Array<{ op: AuthOp; weight: number }> = [
  { op: "auth-signup", weight: 2 },
  { op: "auth-signin", weight: 3 },
  { op: "auth-get-session", weight: 3 },
  { op: "auth-read", weight: 2 },
];

function authReadPath(fixtures: LoadtestFixturesFile): string {
  const roll = Math.random();
  if (roll < 0.35) return "/account";
  if (roll < 0.55) return "/create";
  if (roll < 0.7) return "/create/goty";
  if (roll < 0.85) {
    return `/u/${pickLoadtestUsername(fixtures.writerCount)}`;
  }
  const list = pickLoadtestShareList(fixtures.lists ?? []);
  return list ? loadShareListPath(list) : "/account";
}

async function runAuthScenario(input: {
  appUrl: string;
  databaseUrl: string;
  password: string;
  durationMs: number;
  rampMs: number;
  vusRead: number;
  poolSize: number;
  fixtures: LoadtestFixturesFile;
  tag: string;
}): Promise<string> {
  const target = { appUrl: input.appUrl };
  const query = neon(input.databaseUrl) as unknown as NeonSql;
  const pgBefore = await snapshotPgStatStatementsAt(input.databaseUrl);
  await warmup(input.appUrl, "/auth/sign-in");

  const samples: LoadSample[] = [];
  const started = new Date();
  const end = started.getTime() + input.durationMs;
  const rampMs = Math.min(Math.max(0, input.rampMs), input.durationMs);
  const journey = `${input.tag}-auth`;
  const runId = stampUtc(started).slice(0, 20);
  const poolSize = Math.max(1, Math.min(input.poolSize, input.fixtures.writerCount));

  const vus = Array.from({ length: Math.max(1, input.vusRead) }, async (_, vu) => {
    const delay = loadVuStartOffsetMs(vu, Math.max(1, input.vusRead), rampMs);
    if (delay > 0) await sleep(delay);

    let cookie = "";
    let signupSeq = 0;
    const poolIndex = (vu % poolSize) + 1;

    // Seed the jar once so get-session / signed-in reads have a session.
    {
      const account = loadtestAccount(poolIndex);
      const signed = await signInEmailCookie(target, {
        email: account.email,
        password: input.password,
      });
      if (signed.ok) cookie = signed.cookie;
    }

    while (Date.now() < end) {
      const item = pickWeighted(AUTH_OPS);
      const t0 = Date.now();
      try {
        if (item.op === "auth-signup") {
          signupSeq += 1;
          const email = loadtestSignUpEmail({
            runId,
            vu,
            seq: signupSeq,
          });
          const res = await authPost(target, "sign-up/email", {
            email,
            password: input.password,
            name: `Load SU ${vu}-${signupSeq}`,
          });
          // @example.com skips Worker EMAIL; SQL verify so a follow-up sign-in works.
          if (res.ok) {
            const authUserId = await findAuthUserIdByEmail(query, email);
            if (authUserId) {
              await markAuthEmailVerified({ authUserId, query });
            }
            cookie = mergeAuthCookies(cookie, res);
          }
          samples.push({
            group: "general",
            step: item.op,
            status: res.status,
            ms: Date.now() - t0,
            ok: res.ok,
            at: Date.now(),
            ...readLoadCostHeaders(res.headers),
          });
          continue;
        }

        if (item.op === "auth-signin") {
          const account = loadtestAccount((vu + signupSeq) % poolSize + 1);
          const res = await authPost(target, "sign-in/email", {
            email: account.email,
            password: input.password,
          });
          if (res.ok) cookie = mergeAuthCookies("", res);
          samples.push({
            group: "general",
            step: item.op,
            status: res.status,
            ms: Date.now() - t0,
            ok: res.ok,
            at: Date.now(),
            ...readLoadCostHeaders(res.headers),
          });
          continue;
        }

        if (item.op === "auth-get-session") {
          if (!cookie) {
            const account = loadtestAccount(poolIndex);
            const signed = await signInEmailCookie(target, {
              email: account.email,
              password: input.password,
            });
            if (signed.ok) cookie = signed.cookie;
          }
          const res = await authGetSession(target, cookie || "x=1");
          if (res.ok) cookie = mergeAuthCookies(cookie, res);
          samples.push({
            group: "general",
            step: item.op,
            status: res.status,
            ms: Date.now() - t0,
            ok: res.ok,
            at: Date.now(),
            ...readLoadCostHeaders(res.headers),
          });
          continue;
        }

        // auth-read
        if (!cookie) {
          const account = loadtestAccount(poolIndex);
          const signed = await signInEmailCookie(target, {
            email: account.email,
            password: input.password,
          });
          if (signed.ok) cookie = signed.cookie;
        }
        const pathName = authReadPath(input.fixtures);
        const res = await fetch(`${input.appUrl}${pathName}`, {
          headers: {
            accept: "text/html",
            cookie: cookie || "",
            "x-cost-journey": journey,
            "x-cost-step": pathName,
          },
        });
        await res.arrayBuffer().catch(() => null);
        samples.push({
          group: "general",
          step: `auth-read:${pathName}`,
          status: res.status,
          ms: Date.now() - t0,
          ok: res.ok,
          at: Date.now(),
          ...readLoadCostHeaders(res.headers),
        });
      } catch {
        samples.push({
          group: "general",
          step: item.op,
          status: 0,
          ms: Date.now() - t0,
          ok: false,
          at: Date.now(),
        });
      }
    }
  });

  await Promise.all(vus);
  const ended = new Date();
  const stats: LoadRunStats = {
    scenario: "auth",
    durationMs: ended.getTime() - started.getTime(),
    rampMs,
    vusRead: input.vusRead,
    writers: 0,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    samples,
    pgExec: await capturePgExec(input.databaseUrl, pgBefore),
  };
  const report = formatLoadReport(stats);
  const html = formatLoadHtmlReport(stats);
  const dir = path.resolve("e2e/.cost");
  await mkdir(dir, { recursive: true });
  const stem = `load-auth-${stampUtc(started)}`;
  const file = path.join(dir, `${stem}.md`);
  await writeFile(file, report);
  await writeFile(path.join(dir, `${stem}.json`), JSON.stringify(stats));
  await writeFile(path.join(dir, `${stem}.html`), html);
  console.log(report);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
  console.log(`wrote ${path.relative(process.cwd(), path.join(dir, `${stem}.html`))}`);
  return file;
}

async function runScenario(input: {
  scenario: LoadtestScenario;
  appUrl: string;
  databaseUrl: string;
  password: string;
  durationMs: number;
  rampMs: number;
  vusRead: number;
  writers: number;
  fixtures: LoadtestFixturesFile;
  tag: string;
  skipRepair: boolean;
}): Promise<string> {
  if (input.scenario === "auth") {
    return runAuthScenario({
      appUrl: input.appUrl,
      databaseUrl: input.databaseUrl,
      password: input.password,
      durationMs: input.durationMs,
      rampMs: input.rampMs,
      vusRead: input.vusRead,
      poolSize: Math.max(1, input.writers || input.fixtures.writerCount),
      fixtures: input.fixtures,
      tag: input.tag,
    });
  }

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

  const signedInReaders = Math.min(
    input.vusRead,
    Math.floor(input.vusRead * LOADTEST_SIGNED_IN_READ_FRACTION),
  );
  const authTarget = { appUrl: input.appUrl };

  const readers = Array.from({ length: input.vusRead }, async (_, i) => {
    const delay = loadVuStartOffsetMs(i, input.vusRead, rampMs);
    if (delay > 0) await sleep(delay);

    const account =
      i < signedInReaders && input.fixtures.writerCount > 0
        ? loadtestAccount((i % input.fixtures.writerCount) + 1)
        : null;
    const session = emptyLoadCookieSlot();
    let signedIn = false;
    if (account) {
      signedIn = await keepTrafficSession({
        slot: session,
        appUrl: input.appUrl,
        email: account.email,
        password: input.password,
        samples,
        group: "read",
        force: true,
      });
    }

    while (Date.now() < end) {
      if (signedIn && account) {
        signedIn = await keepTrafficSession({
          slot: session,
          appUrl: input.appUrl,
          email: account.email,
          password: input.password,
          samples,
          group: "read",
        });
        if (!signedIn) {
          session.cookie = "";
          session.refreshedAt = 0;
        }
      }
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
        const headers: Record<string, string> = {
          accept: item.pickSearch === "api" ? "application/json" : "text/html",
          "x-cost-journey": journey,
          "x-cost-step": path,
        };
        if (session.cookie) headers.cookie = session.cookie;
        const res = await fetch(`${input.appUrl}${path}`, { headers });
        if (session.cookie) {
          session.cookie = mergeAuthCookies(session.cookie, res);
        }
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

  const writerSlots: WriterSlot[] = Array.from({ length: input.writers }, () => ({
    list: emptyWriterListState(),
  }));

  const writerLoops = Array.from({ length: input.writers }, async (_, i) => {
    const slot = writerSlots[i];
    if (!slot || writesOpen.length === 0) return;
    const delay = loadVuStartOffsetMs(i, input.writers, rampMs);
    if (delay > 0) await sleep(delay);

    const account = loadtestAccount(i + 1);
    const session = emptyLoadCookieSlot();
    if (
      !(await keepTrafficSession({
        slot: session,
        appUrl: input.appUrl,
        email: account.email,
        password: input.password,
        samples,
        group: "write",
        force: true,
      }))
    ) {
      return;
    }

    const postWrite = (op: LoadWriteOp, body: unknown, step: string) =>
      fetch(`${input.appUrl}/api/qa/loadtest`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: session.cookie,
          "x-cost-journey": journey,
          "x-cost-step": step,
        },
        body: JSON.stringify(body),
      });

    const postOnce = async (op: LoadWriteOp, body: unknown, step: string) => {
      let res = await postWrite(op, body, step);
      if (res.status === 401) {
        const alive = await keepTrafficSession({
          slot: session,
          appUrl: input.appUrl,
          email: account.email,
          password: input.password,
          samples,
          group: "write",
          force: true,
        });
        if (!alive) {
          const text = await res.text().catch(() => "");
          return { res, text };
        }
        res = await postWrite(op, body, step);
      }
      session.cookie = mergeAuthCookies(session.cookie, res);
      const text = await res.text().catch(() => "");
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
      if (
        !(await keepTrafficSession({
          slot: session,
          appUrl: input.appUrl,
          email: account.email,
          password: input.password,
          samples,
          group: "write",
        }))
      ) {
        break;
      }
      const item = pickWeighted(
        pickemPhaseRef.phase === "locked" ? writesLocked : writesOpen,
      );
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

  const lockPhase = (async () => {
    if (input.scenario !== "pickem" && input.scenario !== "editions") return;
    const wait = lockAt - Date.now();
    if (wait > 0) await sleep(wait);
    if (input.scenario === "editions") {
      if (!input.skipRepair) {
        const published = await publishEditionForSeed(
          LOADTEST_COMMUNITY.slug,
          LOADTEST_EDITION_YEAR,
          createDb(input.databaseUrl),
        );
        if ("error" in published) throw new Error(published.error);
      }
      pickemPhaseRef.phase = "locked";
      return;
    }
    pickemPhaseRef.phase = "locked";
    if (input.skipRepair) return;
    await repairLoadtestTgaYear(createDb(input.databaseUrl), {
      year: LOADTEST_TGA_YEAR,
      phase: "locked",
      communityId: input.fixtures.communityId,
    });
  })();

  try {
    await Promise.all([...readers, ...writerLoops, lockPhase]);
  } finally {
    if (restoreSchedule) {
      await restoreLoadtestTgaSchedule(
        createDb(input.databaseUrl),
        LOADTEST_TGA_YEAR,
        restoreSchedule,
      );
    }
    if (input.scenario === "editions" && !input.skipRepair) {
      await repairLoadtestPublishedEdition(createDb(input.databaseUrl), {
        communityId: input.fixtures.communityId,
        year: LOADTEST_EDITION_YEAR,
      });
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

  if (args.writers > fixtures.writerCount) {
    throw new Error(
      `Need ${args.writers} writer profiles; run pnpm qa:loadtest:ensure -- --writers ${args.writers}`,
    );
  }
  const needsTrafficWriters = args.scenarios.some((s) => s !== "auth");
  if (
    (needsTrafficWriters && args.writers > 0 && fixtures.writerCount < 1) ||
    (args.scenarios.includes("auth") && fixtures.writerCount < 1)
  ) {
    throw new Error(
      "Need ensured writer accounts; run pnpm qa:loadtest:ensure -- --writers N",
    );
  }

  const skipRepair = process.env.COST_LOAD_SKIP_REPAIR === "1";
  if (skipRepair) {
    console.log("cost-load: skipping phase repair");
  } else if (args.scenarios.some((s) => s !== "auth")) {
    await repairPhases(fixtures, target.databaseUrl);
  }
  const tag = process.env.COST_RUN_TAG?.trim() || `load-${Date.now()}`;

  for (const scenario of args.scenarios) {
    await runScenario({
      scenario,
      appUrl: target.appUrl,
      databaseUrl: target.databaseUrl,
      password: target.password,
      durationMs: args.durationMs,
      rampMs: args.rampMs,
      vusRead: args.vusRead,
      writers: args.writers,
      fixtures,
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
