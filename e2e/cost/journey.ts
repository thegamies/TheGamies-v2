import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page, Request as PwRequest } from "@playwright/test";
import {
  classifyRequest,
  REQUEST_COST_JOURNEY_HEADER,
  REQUEST_COST_STEP_HEADER,
} from "../../src/lib/cloudflare/request-cost";
import type {
  BrowserRequest,
  BrowserRequestKind,
  JourneyRun,
  JourneyStep,
} from "../../src/lib/request-cost/report";
import { costWarmupHits } from "../../src/lib/request-cost/warmup";

export const COST_DIR = path.resolve("e2e/.cost");

export type StepPlan = {
  step: string;
  /** App path (with query) for this step. */
  path: string;
  /** Click the in-page link to this path (client navigation) when it exists. */
  click?: boolean;
};

/** Same tag the `wrangler tail --header` filter was started with. */
export function costRunTag(): string {
  const tag = process.env.COST_RUN_TAG?.trim();
  if (!tag) throw new Error("COST_RUN_TAG is required.");
  return tag;
}

function browserKind(req: PwRequest, url: URL): BrowserRequestKind {
  if (url.pathname.startsWith("/_next/static/")) return "asset";
  if (
    !url.pathname.startsWith("/_next/image") &&
    /\.[a-z0-9]{2,5}$/i.test(url.pathname)
  ) {
    return "asset";
  }
  try {
    return classifyRequest(
      new Request(url, { method: req.method(), headers: req.headers() }),
    );
  } catch {
    return "other";
  }
}

/**
 * Walk `steps` in one page, tagging same-origin requests with the run and
 * step headers, and record what the browser fetched for each step.
 */
export async function recordJourney(
  page: Page,
  meta: { journey: string; viewer: string; baseUrl: string },
  steps: StepPlan[],
): Promise<JourneyRun> {
  const tag = costRunTag();
  const origin = new URL(meta.baseUrl).origin;
  const warmupHits = costWarmupHits();
  const firstPath = steps[0]?.path;
  if (firstPath && warmupHits > 0) {
    const warmUrl = new URL(firstPath, origin).href;
    for (let i = 0; i < warmupHits; i++) {
      const res = await page.request.get(warmUrl);
      if (!res.ok()) {
        throw new Error(
          `Cost warm-up hit ${i + 1}/${warmupHits} returned HTTP ${res.status()}.`,
        );
      }
    }
  }

  let current: JourneyStep | null = null;
  const pending: Promise<void>[] = [];

  await page.route(`${origin}/**`, (route) => {
    const headers = {
      ...route.request().headers(),
      [REQUEST_COST_JOURNEY_HEADER]: tag,
      [REQUEST_COST_STEP_HEADER]: current?.step ?? "setup",
    };
    return route.continue({ headers });
  });

  const onFinished = (req: PwRequest) => {
    const url = new URL(req.url());
    if (url.origin !== origin || !current) return;
    const bucket = current;
    pending.push(
      (async () => {
        const [sizes, res] = await Promise.all([req.sizes(), req.response()]);
        const entry: BrowserRequest = {
          kind: browserKind(req, url),
          url: `${url.pathname}${url.search}`,
          status: res?.status() ?? 0,
          transferBytes: sizes.responseBodySize,
        };
        bucket.requests.push(entry);
      })().catch(() => undefined),
    );
  };
  // Aborted requests (superseded navigations, cancelled prefetches) still reach the Worker.
  const onFailed = (req: PwRequest) => {
    const url = new URL(req.url());
    if (url.origin !== origin || !current) return;
    current.requests.push({
      kind: browserKind(req, url),
      url: `${url.pathname}${url.search}`,
      status: 0,
      transferBytes: 0,
    });
  };
  page.on("requestfinished", onFinished);
  page.on("requestfailed", onFailed);

  const run: JourneyRun = {
    journey: meta.journey,
    viewer: meta.viewer,
    tag,
    baseUrl: origin,
    startedAt: new Date().toISOString(),
    warmupHits,
    steps: [],
  };

  for (const plan of steps) {
    const link = plan.click
      ? page.locator(`a[href="${plan.path}"]`).first()
      : null;
    const canClick = link ? await link.isVisible().catch(() => false) : false;
    current = {
      step: plan.step,
      url: plan.path,
      navigation: canClick ? "client" : "document",
      requests: [],
    };
    run.steps.push(current);

    if (canClick && link) {
      await link.click();
      await page.waitForURL((u) => `${u.pathname}${u.search}` === plan.path);
    } else {
      await page.goto(plan.path);
    }
    await page.waitForLoadState("networkidle");
    await Promise.all(pending.splice(0));
  }

  page.off("requestfinished", onFinished);
  page.off("requestfailed", onFailed);
  await page.unroute(`${origin}/**`);
  current = null;
  return run;
}

export async function saveJourney(run: JourneyRun): Promise<string> {
  await mkdir(COST_DIR, { recursive: true });
  const slug = `${run.journey}-${run.viewer}`.replace(/[^a-z0-9]+/gi, "-");
  const file = path.join(COST_DIR, `${slug.toLowerCase()}.json`);
  await writeFile(file, JSON.stringify(run, null, 2));
  return file;
}
