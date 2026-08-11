"use client";

import { useEffect, useState } from "react";
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

/** One HTTP request each — avoids Vercel killing a single enrich-all call. */
const ENRICH_STEPS = [
  "covers",
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

type Props = {
  authorized: boolean;
  initialRuns: SyncRun[];
  initialResume: ResumeInfo | null;
};

function scopeLabel(scope: Record<string, unknown> | null): string {
  if (!scope) return "—";
  const year = scope.year;
  if (typeof year === "number") return String(year);
  return "full";
}

export function AdminSyncClient({
  authorized,
  initialRuns,
  initialResume,
}: Props) {
  const [authed, setAuthed] = useState(authorized);
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState(String(new Date().getUTCFullYear()));
  const [allYears, setAllYears] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>(initialRuns);
  const [resume, setResume] = useState(initialResume);

  async function loadStatus(forYear?: number) {
    const y = forYear ?? Number(year);
    const qs = Number.isFinite(y) ? `?year=${y}` : "";
    const res = await fetch(`/api/admin/sync${qs}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as {
      runs: SyncRun[];
      resume: ResumeInfo;
    };
    setRuns(json.runs);
    setResume(json.resume);
  }

  useEffect(() => {
    if (!authed) return;
    const y = Number(year);
    if (!Number.isFinite(y)) return;
    const timer = setTimeout(() => {
      void loadStatus(y);
    }, 300);
    return () => clearTimeout(timer);
  }, [authed, year]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        setMessage("Invalid secret");
        return;
      }
      setAuthed(true);
      setMessage("Unlocked");
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

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

  if (!authed) {
    return (
      <form onSubmit={unlock} className="max-w-md space-y-4">
        <p className="text-muted">
          Enter <code className="text-ink">ADMIN_SYNC_SECRET</code> to unlock
          sync controls.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full border border-line bg-panel px-3 py-2 text-ink"
          placeholder="Admin secret"
        />
        <Button type="submit" disabled={busy}>
          Unlock
        </Button>
        {message ? <p className="text-sm text-accent">{message}</p> : null}
      </form>
    );
  }

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
