"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type SyncRun = {
  id: string;
  kind: string;
  status: string;
  scope: Record<string, unknown> | null;
  rowsProcessed: number;
  pages: number;
  lastIgdbId: number | null;
  error: string | null;
  startedAt: string | Date;
  finishedAt: string | Date | null;
};

type ResumeInfo = {
  afterId: number;
  canContinue: boolean;
  year: number | null;
};

type WalkResume = {
  afterId: number;
  canContinue: boolean;
  entity: string;
  currentEntity: string | null;
  completed: string[];
  sinceUnix: number | null;
};

type WalkPageResult = {
  synced: number;
  pages: number;
  lastId: number;
  truncated: boolean;
  entity: string;
  allDone: boolean;
  nextEntity: string | null;
  currentEntity: string;
  completed: string[];
};

const ENRICH_STEPS = [
  "covers",
  "artworks",
  "screenshots",
  "game_videos",
  "image_types",
  "platforms",
  "genres",
  "themes",
  "keywords",
  "game_types",
  "involved_companies",
  "companies",
  "ttb",
] as const;

type EnrichStep = (typeof ENRICH_STEPS)[number];

const CATALOG_WALK_ENTITIES = [
  "all",
  "image_types",
  "platforms",
  "genres",
  "themes",
  "keywords",
  "game_types",
  "companies",
  "games",
  "covers",
  "artworks",
  "screenshots",
  "game_videos",
  "involved_companies",
  "ttb",
] as const;

const ENTITY_LABELS: Record<string, string> = {
  all: "All types",
  image_types: "Image types",
  platforms: "Platforms",
  genres: "Genres",
  themes: "Themes",
  keywords: "Keywords",
  game_types: "Game types",
  companies: "Companies",
  games: "Games",
  covers: "Covers",
  artworks: "Artworks",
  screenshots: "Screenshots",
  game_videos: "Game videos",
  involved_companies: "Involved companies",
  ttb: "Time to beat",
};

type Props = {
  initialRuns: SyncRun[];
  initialResume: ResumeInfo | null;
  initialCatalogResume: WalkResume | null;
  initialUpdatedResume: WalkResume | null;
};

function scopeLabel(scope: Record<string, unknown> | null): string {
  if (!scope) return "—";
  const entity =
    typeof scope.entity === "string"
      ? scope.entity
      : typeof scope.currentEntity === "string"
        ? scope.currentEntity
        : null;
  const year = scope.year;
  const mode = typeof scope.mode === "string" ? scope.mode : null;
  const parts: string[] = [];
  if (mode) parts.push(mode);
  if (entity) parts.push(entity);
  if (typeof year === "number") parts.push(String(year));
  if (parts.length) return parts.join(" · ");
  return "full";
}

function dateToUnix(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const t = Date.parse(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(t)) return undefined;
  return Math.floor(t / 1000);
}

export function AdminSyncClient({
  initialRuns,
  initialResume,
  initialCatalogResume,
  initialUpdatedResume,
}: Props) {
  const [year, setYear] = useState(String(new Date().getUTCFullYear()));
  const [allYears, setAllYears] = useState(false);
  const [walkEntity, setWalkEntity] = useState("all");
  const [sinceDate, setSinceDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>(initialRuns);
  const [resume, setResume] = useState(initialResume);
  const [catalogResume, setCatalogResume] = useState(initialCatalogResume);
  const [updatedResume, setUpdatedResume] = useState(initialUpdatedResume);

  const loadStatus = useCallback(async (forYear?: number) => {
    const y = forYear ?? Number(year);
    const qs = new URLSearchParams();
    if (Number.isFinite(y)) qs.set("year", String(y));
    qs.set("entity", walkEntity);
    const res = await fetch(`/api/admin/sync?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      runs: SyncRun[];
      resume: ResumeInfo;
      catalogResume: WalkResume;
      updatedResume: WalkResume;
    };
    setRuns(json.runs);
    setResume(json.resume);
    setCatalogResume(json.catalogResume);
    setUpdatedResume(json.updatedResume);
  }, [year, walkEntity]);

  useEffect(() => {
    const y = Number(year);
    if (!Number.isFinite(y)) return;
    const timer = setTimeout(() => {
      void loadStatus(y);
    }, 300);
    return () => clearTimeout(timer);
  }, [year, walkEntity, loadStatus]);

  function enrichScope(): { year?: number } {
    return allYears ? {} : { year: Number(year) };
  }

  async function postSync(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Request failed");
    }
    return json;
  }

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const json = await postSync(body);
      setMessage(JSON.stringify(json, null, 2));
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function walkPages(
    action: "catalog" | "updated",
    fromStart: boolean,
  ) {
    setBusy(true);
    setMessage(null);
    const sinceUnix =
      action === "updated" ? dateToUnix(sinceDate) : undefined;
    try {
      let first = true;
      for (;;) {
        const label = ENTITY_LABELS[walkEntity] ?? walkEntity;
        setMessage(`Walking ${label}…`);
        const json = (await postSync({
          action,
          entity: walkEntity,
          maxPages: 1,
          ...(first && fromStart ? { reset: true, afterId: 0 } : {}),
          ...(first && sinceUnix != null ? { sinceUnix } : {}),
        })) as WalkPageResult;
        first = false;
        const current = ENTITY_LABELS[json.currentEntity] ?? json.currentEntity;
        setMessage(
          `${current}: last id ${json.lastId}, ${json.synced} rows this page.`,
        );
        await loadStatus();
        if (json.allDone) {
          setMessage(`${label} finished.`);
          break;
        }
      }
    } catch (err) {
      setMessage(
        `${err instanceof Error ? err.message : String(err)}\n\n` +
          "Continue resumes from the last saved id.",
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function runEnrichStep(entity: EnrichStep) {
    await run({ action: "enrich", entity, ...enrichScope() });
  }

  async function runEnrichAll() {
    setBusy(true);
    setMessage(null);
    const out: Record<string, unknown> = {};
    const scope = enrichScope();
    const label = allYears ? "all years" : `year ${year}`;
    try {
      for (const entity of ENRICH_STEPS) {
        setMessage(`Enriching ${entity} (${label})…`);
        out[entity] = await postSync({
          action: "enrich",
          entity,
          ...scope,
        });
      }
      setMessage(JSON.stringify({ scope: label, enrich: out }, null, 2));
      await loadStatus();
    } catch (err) {
      setMessage(
        `${err instanceof Error ? err.message : String(err)}\n\n` +
          `Partial: ${JSON.stringify(out, null, 2)}\n` +
          `Re-run Enrich all — already-done lookups are skipped.`,
      );
    } finally {
      setBusy(false);
    }
  }

  const yearNum = Number(year);
  const catalogCanContinue = Boolean(catalogResume?.canContinue);
  const updatedCanContinue = Boolean(updatedResume?.canContinue);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-wide">Scope</h2>
        <label className="block text-sm text-muted">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={allYears}
            className="mt-1 block w-40 border border-line bg-panel px-3 py-2 text-ink disabled:opacity-50"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={allYears}
            onChange={(e) => setAllYears(e.target.checked)}
            className="border-line"
          />
          Enrich all years (ignore year; full catalog lookups)
        </label>
        <p className="max-w-2xl text-sm text-muted">
          Large enrich jobs may time out on hosted requests. Enrich all runs
          one entity type per request — re-run if a step stops early; already
          completed lookups are skipped.
        </p>
        {resume?.canContinue ? (
          <p className="text-sm text-muted">
            {resume.year != null ? `Year ${resume.year}` : "Full catalog"}{" "}
            backfill can resume after IGDB id {resume.afterId}.
          </p>
        ) : (
          <p className="text-sm text-muted">
            No unfinished backfill for this year.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl tracking-wide">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              run({
                action: "backfill",
                year: yearNum,
                afterId: 0,
                maxPages: 20,
              })
            }
          >
            Backfill year (from start)
          </Button>
          <Button
            type="button"
            disabled={busy || !resume?.canContinue}
            onClick={() =>
              run({
                action: "backfill",
                year: yearNum,
                afterId: resume?.afterId,
                maxPages: 20,
              })
            }
          >
            Continue year
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              run({
                action: "backfill",
                afterId: 0,
                maxPages: 20,
              })
            }
          >
            Full backfill chunk
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => run({ action: "incremental", maxPages: 20 })}
          >
            Incremental
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              run({ action: "import", year: yearNum, maxPages: 50 })
            }
          >
            Import year + enrich
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void runEnrichAll()}
          >
            Enrich all {allYears ? "(all years)" : `(${year})`}
          </Button>
          {ENRICH_STEPS.map((entity) => (
            <Button
              key={entity}
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={() => void runEnrichStep(entity)}
            >
              Enrich {entity}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-wide">
          Full catalog and updates
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          Walks every record of a type from the lowest id, or only records
          updated since a date. Each step syncs one page; this page keeps
          requesting the next until the walk finishes. Leave the tab open. If
          a page fails, Continue starts from the last saved id.
        </p>
        <label className="block text-sm text-muted">
          Catalog type
          <select
            value={walkEntity}
            onChange={(e) => setWalkEntity(e.target.value)}
            className="mt-1 block w-64 border border-line bg-panel px-3 py-2 text-ink"
          >
            {CATALOG_WALK_ENTITIES.map((entity) => (
              <option key={entity} value={entity}>
                {ENTITY_LABELS[entity]}
              </option>
            ))}
          </select>
        </label>
        {catalogResume?.canContinue ? (
          <p className="text-sm text-muted">
            Catalog walk can resume{" "}
            {ENTITY_LABELS[catalogResume.currentEntity ?? ""] ??
              catalogResume.currentEntity}{" "}
            after id {catalogResume.afterId}.
          </p>
        ) : (
          <p className="text-sm text-muted">No unfinished catalog walk.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void walkPages("catalog", true)}
          >
            Walk from start
          </Button>
          <Button
            type="button"
            disabled={busy || !catalogCanContinue}
            onClick={() => void walkPages("catalog", false)}
          >
            Continue catalog
          </Button>
        </div>
        <label className="block text-sm text-muted">
          Updated since (optional)
          <input
            type="date"
            value={sinceDate}
            onChange={(e) => setSinceDate(e.target.value)}
            className="mt-1 block w-48 border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <p className="max-w-2xl text-sm text-muted">
          Leave the date blank to use the last successful update walk. Continue
          keeps the same window.
        </p>
        {updatedResume?.canContinue ? (
          <p className="text-sm text-muted">
            Update walk can resume{" "}
            {ENTITY_LABELS[updatedResume.currentEntity ?? ""] ??
              updatedResume.currentEntity}{" "}
            after id {updatedResume.afterId}.
          </p>
        ) : (
          <p className="text-sm text-muted">No unfinished update walk.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void walkPages("updated", true)}
          >
            Walk updates from start
          </Button>
          <Button
            type="button"
            disabled={busy || !updatedCanContinue}
            onClick={() => void walkPages("updated", false)}
          >
            Continue updates
          </Button>
        </div>
      </section>

      {message ? (
        <pre className="overflow-x-auto border border-line bg-panel p-4 text-xs text-muted whitespace-pre-wrap">
          {message}
        </pre>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl tracking-wide">Recent runs</h2>
          <Button
            type="button"
            variant="quiet"
            disabled={busy}
            onClick={() => void loadStatus()}
          >
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Pages</th>
                <th className="px-3 py-2 font-medium">Last id</th>
                <th className="px-3 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-line/60">
                  <td className="px-3 py-2">{run.kind}</td>
                  <td className="px-3 py-2">{scopeLabel(run.scope)}</td>
                  <td className="px-3 py-2">{run.status}</td>
                  <td className="px-3 py-2">{run.rowsProcessed}</td>
                  <td className="px-3 py-2">{run.pages}</td>
                  <td className="px-3 py-2">{run.lastIgdbId ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {runs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-muted"
                  >
                    No sync runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
