import type { LoadRunStats, LoadSample } from "./load-report";

type CompactSample = [
  group: string,
  step: string,
  status: number,
  ms: number,
  wallMs: number,
  dbMs: number,
  dbSpanMs: number,
  dbTrips: number,
  trips: Array<[qIndex: number, ms: number]>,
];

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function compactSamples(samples: LoadSample[]): {
  queries: string[];
  samples: CompactSample[];
} {
  const queries: string[] = [];
  const index = new Map<string, number>();
  const qid = (sql: string) => {
    const existing = index.get(sql);
    if (existing != null) return existing;
    const id = queries.length;
    queries.push(sql);
    index.set(sql, id);
    return id;
  };
  return {
    queries,
    samples: samples.map((s) => [
      s.group,
      s.step,
      s.status,
      s.ms,
      s.wallMs ?? -1,
      s.dbMs ?? -1,
      s.dbSpanMs ?? -1,
      s.dbTrips ?? -1,
      (s.trips ?? []).map((trip) => [qid(trip.sql), trip.ms] as [number, number]),
    ]),
  };
}

export function formatLoadHtmlReport(stats: LoadRunStats): string {
  const compact = compactSamples(stats.samples);
  const payload = {
    scenario: stats.scenario,
    durationMs: stats.durationMs,
    vusRead: stats.vusRead,
    writers: stats.writers,
    startedAt: stats.startedAt,
    endedAt: stats.endedAt,
    queries: compact.queries,
    samples: compact.samples,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Load ${escapeHtml(stats.scenario)} · ${escapeHtml(stats.startedAt)}</title>
  <style>
    :root {
      --bg: #f4efe6;
      --ink: #161513;
      --muted: #6b6560;
      --line: #d9d1c5;
      --card: #fffdf8;
      --accent: #8b1e1e;
      --ok: #1f6b3a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.45 "Source Serif 4", Georgia, serif;
      background: var(--bg);
      color: var(--ink);
    }
    header, main { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1.25rem; }
    header { padding-bottom: 0; }
    h1 { font: 700 1.75rem/1.15 "Archivo", system-ui, sans-serif; letter-spacing: 0.02em; margin: 0 0 0.35rem; }
    .meta { color: var(--muted); font-size: 0.92rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
      gap: 0.75rem;
      margin: 1.25rem 0;
    }
    .stat {
      background: var(--card);
      border: 1px solid var(--line);
      padding: 0.75rem 0.85rem;
    }
    .stat b { display: block; font: 700 1.35rem/1.1 "Archivo", system-ui, sans-serif; }
    .stat span { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; }
    fieldset {
      border: 1px solid var(--line);
      background: var(--card);
      margin: 0 0 0.75rem;
      padding: 0.65rem 0.85rem 0.75rem;
    }
    legend { font: 600 0.75rem/1 "Archivo", system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    button.chip {
      font: 600 0.82rem/1.2 "Archivo", system-ui, sans-serif;
      border: 1px solid var(--line);
      background: transparent;
      color: var(--ink);
      padding: 0.35rem 0.55rem;
      cursor: pointer;
    }
    button.chip[aria-pressed="true"] {
      background: var(--ink);
      color: var(--bg);
      border-color: var(--ink);
    }
    .hist {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 120px;
      margin: 1rem 0 0.25rem;
      border-bottom: 1px solid var(--line);
    }
    .bar {
      flex: 1;
      background: var(--accent);
      min-height: 1px;
      opacity: 0.85;
    }
    .axis { color: var(--muted); font-size: 0.8rem; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--line); font-size: 0.92rem; }
    th { font: 600 0.72rem/1 "Archivo", system-ui, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    td.num, th.num { text-align: right; }
    .empty { color: var(--muted); padding: 1.5rem 0; }
    code { font-size: 0.85em; }
  </style>
</head>
<body>
  <header>
    <h1>Load test ${escapeHtml(stats.scenario)}</h1>
    <p class="meta">
      ${escapeHtml(stats.startedAt)} → ${escapeHtml(stats.endedAt)}
      · ${Math.round(stats.durationMs / 1000)}s
      · ${stats.vusRead} readers · ${stats.writers} writers
    </p>
    <p class="meta">Filter by group, kind (<code>/games/:slug</code> rolls up game pages), then a path. Client is the runner round-trip. Wall is Worker time. Db clock is overlap-union of Neon trips; db sum adds parallel trips. Trip table is SQL fingerprints (no bind params).</p>
  </header>
  <main>
    <fieldset>
      <legend>Group</legend>
      <div class="chips" id="groups"></div>
    </fieldset>
    <fieldset>
      <legend>Kind</legend>
      <div class="chips" id="families"></div>
    </fieldset>
    <fieldset id="step-field">
      <legend>Path / op</legend>
      <div class="chips" id="steps"></div>
    </fieldset>
    <fieldset>
      <legend>Status</legend>
      <div class="chips" id="statuses"></div>
    </fieldset>
    <div class="stats" id="stats"></div>
    <div class="hist" id="hist" aria-hidden="true"></div>
    <div class="axis"><span>0 ms</span><span id="hist-max"></span></div>
    <table>
      <thead>
        <tr>
          <th>Slice</th>
          <th class="num">n</th>
          <th class="num">client p50 / p90 / p95</th>
          <th class="num">wall p50 / p90 / p95</th>
          <th class="num">db clock p50 / p90 / p95</th>
          <th class="num">db sum p50 / p90 / p95</th>
          <th class="num">max</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <h2 style="font:700 1rem/1.2 Archivo,system-ui,sans-serif;margin:2rem 0 0.5rem">Neon trips</h2>
    <p class="meta">Same filter as above. One HTTP trip to Neon; a batch is several statements joined with <code>|</code>.</p>
    <table>
      <thead>
        <tr>
          <th>SQL</th>
          <th class="num">n</th>
          <th class="num">p50</th>
          <th class="num">p90</th>
          <th class="num">p95</th>
          <th class="num">max</th>
        </tr>
      </thead>
      <tbody id="trips"></tbody>
    </table>
  </main>
  <script>
    const DATA = ${jsonForScript(payload)};
    const ALL = "all";
    const GAME_FAMILY = "/games/:slug";
    const filters = { group: ALL, family: ALL, step: ALL, status: ALL };

    function familyOf(step) {
      return step.indexOf("/games/") === 0 && step.length > 7 ? GAME_FAMILY : step;
    }
    function percentile(sorted, p) {
      if (!sorted.length) return 0;
      const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
      return sorted[rank];
    }
    function col(rows, idx) {
      return rows.map((r) => r[idx]).filter((n) => typeof n === "number" && n >= 0).sort((a, b) => a - b);
    }
    function band(sorted) {
      if (!sorted.length) return null;
      return {
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted[sorted.length - 1] || 0,
      };
    }
    function fmtBand(b) {
      return b ? b.p50 + " / " + b.p90 + " / " + b.p95 : "—";
    }
    function summary(rows) {
      const client = band(col(rows, 3)) || { p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
      const ok = rows.filter((r) => r[2] >= 200 && r[2] < 300).length;
      return {
        n: rows.length,
        ok,
        errors: rows.length - ok,
        client,
        wall: band(col(rows, 4)),
        db: band(col(rows, 5)),
        dbSpan: band(col(rows, 6)),
      };
    }
    function unique(values) {
      return [...new Set(values)].sort((a, b) => {
        if (/^\\d+$/.test(a) && /^\\d+$/.test(b)) return Number(a) - Number(b);
        return a.localeCompare(b);
      });
    }
    function filtered() {
      return DATA.samples.filter((r) => {
        if (filters.group !== ALL && r[0] !== filters.group) return false;
        if (filters.family !== ALL && familyOf(r[1]) !== filters.family) return false;
        if (filters.step !== ALL && r[1] !== filters.step) return false;
        if (filters.status !== ALL && String(r[2]) !== filters.status) return false;
        return true;
      });
    }
    function chips(el, values, key, onPick) {
      el.innerHTML = "";
      for (const value of [ALL, ...values]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = value === ALL ? "All" : value;
        b.setAttribute("aria-pressed", filters[key] === value ? "true" : "false");
        b.addEventListener("click", () => {
          filters[key] = value;
          if (onPick) onPick(value);
          render();
        });
        el.appendChild(b);
      }
    }
    function stat(label, value) {
      return "<div class=\\"stat\\"><b>" + value + "</b><span>" + label + "</span></div>";
    }
    function rowKey(r) {
      if (filters.step !== ALL) return r[0] + " · " + r[1];
      if (filters.family === GAME_FAMILY) return r[0] + " · " + r[1];
      return r[0] + " · " + familyOf(r[1]);
    }
    function render() {
      const inGroup = DATA.samples.filter((r) => filters.group === ALL || r[0] === filters.group);
      chips(document.getElementById("groups"), unique(DATA.samples.map((r) => r[0])), "group", () => {
        filters.family = ALL;
        filters.step = ALL;
      });
      chips(document.getElementById("families"), unique(inGroup.map((r) => familyOf(r[1]))), "family", () => {
        filters.step = ALL;
      });
      const inFamily = inGroup.filter((r) => filters.family === ALL || familyOf(r[1]) === filters.family);
      const stepValues =
        filters.family === GAME_FAMILY
          ? unique(inFamily.map((r) => r[1]))
          : filters.family !== ALL
            ? unique(inFamily.map((r) => r[1]))
            : unique(
                inGroup
                  .filter((r) => familyOf(r[1]) !== GAME_FAMILY)
                  .map((r) => r[1]),
              );
      chips(document.getElementById("steps"), stepValues, "step");
      chips(document.getElementById("statuses"), unique(DATA.samples.map((r) => String(r[2]))), "status");
      const rows = filtered();
      const s = summary(rows);
      const rps = (rows.length / Math.max(0.001, DATA.durationMs / 1000)).toFixed(2);
      document.getElementById("stats").innerHTML =
        stat("Requests", s.n.toLocaleString()) +
        stat("Success", s.ok.toLocaleString()) +
        stat("Errors", s.errors.toLocaleString()) +
        stat("RPS", rps) +
        stat("client p50 / p90 / p95", fmtBand(s.client) + " ms") +
        (s.wall ? stat("wall p50 / p90 / p95", fmtBand(s.wall) + " ms") : "") +
        (s.dbSpan ? stat("db clock p50 / p90 / p95", fmtBand(s.dbSpan) + " ms") : "") +
        (s.db ? stat("db sum p50 / p90 / p95", fmtBand(s.db) + " ms") : "") +
        stat("max client", s.client.max + " ms");
      const cap = Math.max(s.client.p95 * 1.5, 200);
      const buckets = Array(24).fill(0);
      for (const r of rows) {
        const i = Math.min(buckets.length - 1, Math.floor((r[3] / cap) * buckets.length));
        buckets[i] += 1;
      }
      const peak = Math.max(1, ...buckets);
      document.getElementById("hist").innerHTML = buckets
        .map((n) => "<div class=\\"bar\\" style=\\"height:" + Math.round((n / peak) * 100) + "%\\"></div>")
        .join("");
      document.getElementById("hist-max").textContent = Math.round(cap) + " ms";
      const by = new Map();
      for (const r of rows) {
        const k = rowKey(r);
        const list = by.get(k);
        if (list) list.push(r);
        else by.set(k, [r]);
      }
      const tbody = document.getElementById("rows");
      const keys = [...by.keys()].sort();
      tbody.innerHTML = keys.length
        ? keys
            .map((k) => {
              const sl = summary(by.get(k));
              return (
                "<tr><td><code>" +
                k.replace(/</g, "&lt;") +
                "</code></td><td class=\\"num\\">" +
                sl.n +
                "</td><td class=\\"num\\">" +
                fmtBand(sl.client) +
                "</td><td class=\\"num\\">" +
                fmtBand(sl.wall) +
                "</td><td class=\\"num\\">" +
                fmtBand(sl.dbSpan) +
                "</td><td class=\\"num\\">" +
                fmtBand(sl.db) +
                "</td><td class=\\"num\\">" +
                sl.client.max +
                "</td></tr>"
              );
            })
            .join("")
        : "<tr><td class=\\"empty\\" colspan=\\"7\\">No requests in this filter.</td></tr>";
      const tripMs = new Map();
      for (const r of rows) {
        for (const pair of r[8] || []) {
          const sql = DATA.queries[pair[0]] || "(unknown)";
          const list = tripMs.get(sql);
          if (list) list.push(pair[1]);
          else tripMs.set(sql, [pair[1]]);
        }
      }
      const tripKeys = [...tripMs.keys()].sort((a, b) => {
        const as = tripMs.get(a).slice().sort((x, y) => x - y);
        const bs = tripMs.get(b).slice().sort((x, y) => x - y);
        return percentile(bs, 50) - percentile(as, 50);
      });
      const tripBody = document.getElementById("trips");
      tripBody.innerHTML = tripKeys.length
        ? tripKeys
            .map((sql) => {
              const sorted = tripMs.get(sql).slice().sort((a, b) => a - b);
              return (
                "<tr><td><code>" +
                String(sql).replace(/</g, "&lt;") +
                "</code></td><td class=\\"num\\">" +
                sorted.length +
                "</td><td class=\\"num\\">" +
                percentile(sorted, 50) +
                "</td><td class=\\"num\\">" +
                percentile(sorted, 90) +
                "</td><td class=\\"num\\">" +
                percentile(sorted, 95) +
                "</td><td class=\\"num\\">" +
                sorted[sorted.length - 1] +
                "</td></tr>"
              );
            })
            .join("")
        : "<tr><td class=\\"empty\\" colspan=\\"6\\">No trip fingerprints in this filter (deploy staging meter, then re-run).</td></tr>";
    }
    render();
  </script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
