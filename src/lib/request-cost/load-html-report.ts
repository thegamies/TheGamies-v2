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
  tMs: number,
];

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function compactSamples(
  samples: LoadSample[],
  startedAt: string,
): {
  queries: string[];
  samples: CompactSample[];
} {
  const origin = Date.parse(startedAt);
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
      typeof s.at === "number" && Number.isFinite(s.at) && Number.isFinite(origin)
        ? Math.max(0, Math.round(s.at - origin))
        : -1,
    ]),
  };
}

export function formatLoadHtmlReport(stats: LoadRunStats): string {
  const compact = compactSamples(stats.samples, stats.startedAt);
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
    header, .filters { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1.25rem 0; }
    main { padding: 0 1.25rem 2.5rem; }
    h1 { font: 700 1.75rem/1.15 "Archivo", system-ui, sans-serif; letter-spacing: 0.02em; margin: 0 0 0.35rem; }
    .meta { color: var(--muted); font-size: 0.92rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
      gap: 0.75rem;
      margin: 1.25rem 0;
      max-width: 1100px;
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
      max-width: 1100px;
    }
    .bar {
      flex: 1;
      background: var(--accent);
      min-height: 1px;
      opacity: 0.85;
    }
    .axis { color: var(--muted); font-size: 0.8rem; display: flex; justify-content: space-between; max-width: 1100px; }
    .table-scroll {
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid var(--line);
      background: var(--card);
      -webkit-overflow-scrolling: touch;
    }
    table { width: max-content; min-width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--line); font-size: 0.85rem; white-space: nowrap; }
    th { font: 600 0.68rem/1.2 "Archivo", system-ui, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
    th.group { text-align: center; border-bottom: 1px solid var(--line); }
    td.num, th.num { text-align: right; }
    th.sort { cursor: pointer; user-select: none; }
    th.sort:hover { color: var(--ink); }
    th.sort[aria-sort="ascending"]::after { content: " ↑"; color: var(--accent); }
    th.sort[aria-sort="descending"]::after { content: " ↓"; color: var(--accent); }
    th.sticky, td.sticky {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--card);
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    thead th.sticky { z-index: 2; }
    .empty { color: var(--muted); padding: 1.5rem 0; white-space: normal; }
    code { font-size: 0.85em; }
    .chart-wrap {
      background: var(--card);
      border: 1px solid var(--line);
      margin: 1rem 0 0.25rem;
      overflow-x: auto;
    }
    .chart-wrap svg { display: block; width: 100%; height: 260px; min-width: 640px; }
    .legend { display: flex; flex-wrap: wrap; gap: 0.85rem; font-size: 0.82rem; color: var(--muted); margin: 0.35rem 0 1rem; }
    .legend i { display: inline-block; width: 1.1rem; height: 3px; margin-right: 0.35rem; vertical-align: middle; }
    .chart-note { color: var(--muted); padding: 2rem 1rem; }
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
    <p class="meta">Filter by group, kind, path, status, and which percentiles to show. Client is the runner round-trip. Wall is Worker time. Db clock is overlap-union of Neon trips; db sum adds parallel trips. The timeline is client p50–p99 in each time bucket.</p>
  </header>
  <main>
    <div class="filters">
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
    <fieldset>
      <legend>Percentiles</legend>
      <div class="chips" id="pcts"></div>
    </fieldset>
    <fieldset>
      <legend>Timeline buckets</legend>
      <div class="chips" id="buckets"></div>
    </fieldset>
    </div>
    <div class="stats" id="stats"></div>
    <div class="hist" id="hist" aria-hidden="true"></div>
    <div class="axis"><span>0 ms</span><span id="hist-max"></span></div>
    <h2 style="font:700 1rem/1.2 Archivo,system-ui,sans-serif;margin:1.5rem 0 0.35rem">Client pxx over time</h2>
    <p class="meta">Same request filter. Each point is p50 / p90 / p95 / p99 of client latency in that bucket.</p>
    <div class="chart-wrap" id="chart-wrap">
      <svg id="timeline" viewBox="0 0 800 260" role="img" aria-label="Client percentiles over the run"></svg>
    </div>
    <div class="legend" id="legend"></div>
    <div class="table-scroll">
    <table>
      <thead id="slice-head"></thead>
      <tbody id="rows"></tbody>
    </table>
    </div>
    <h2 style="font:700 1rem/1.2 Archivo,system-ui,sans-serif;margin:2rem 0 0.5rem">Neon trips</h2>
    <p class="meta">Same filter as above. One HTTP trip to Neon; a batch is several statements joined with <code>|</code>. Click a column header to sort.</p>
    <div class="table-scroll">
    <table>
      <thead id="trip-head"></thead>
      <tbody id="trips"></tbody>
    </table>
    </div>
  </main>
  <script>
    const DATA = ${jsonForScript(payload)};
    const ALL = "all";
    const GAME_FAMILY = "/games/:slug";
    const PCTS = ["p50", "p90", "p95", "p99", "max"];
    const LINES = ["p50", "p90", "p95", "p99"];
    const LINE_COLOR = { p50: "#1f6b3a", p90: "#8a6d3b", p95: "#8b1e1e", p99: "#3b1a4a" };
    const BUCKETS = [
      { id: "auto", label: "Auto" },
      { id: 1000, label: "1s" },
      { id: 10000, label: "10s" },
      { id: 60000, label: "1m" },
    ];
    const filters = { group: ALL, family: ALL, step: ALL, status: ALL, bucket: "auto" };
    const shown = { p50: true, p90: true, p95: true, p99: true, max: true };
    const sorts = {
      slice: { key: "label", dir: 1 },
      trip: { key: "p50", dir: -1 },
    };

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
    function num(v) {
      return v == null ? "—" : v;
    }
    function visiblePcts() {
      return PCTS.filter((k) => shown[k]);
    }
    function visibleLines() {
      return LINES.filter((k) => shown[k]);
    }
    function bandStats(prefix, b) {
      if (!b) return "";
      return visiblePcts().map((k) => stat(prefix + " " + k, b[k] + " ms")).join("");
    }
    function bucketSize() {
      if (filters.bucket !== "auto") return filters.bucket;
      const d = DATA.durationMs;
      if (d >= 10 * 60 * 1000) return 60000;
      if (d >= 2 * 60 * 1000) return 10000;
      return 1000;
    }
    function formatBucket(ms) {
      if (ms >= 60000) return Math.round(ms / 60000) + "m";
      if (ms % 1000 === 0) return ms / 1000 + "s";
      return Math.round(ms) + "ms";
    }
    function getVal(row, key) {
      const parts = key.split(".");
      let cur = row;
      for (const p of parts) {
        if (cur == null) return null;
        cur = cur[p];
      }
      return cur;
    }
    function sortRows(list, sort) {
      const { key, dir } = sort;
      return list.slice().sort((a, b) => {
        const av = getVal(a, key);
        const bv = getVal(b, key);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "string") return av.localeCompare(bv) * dir;
        return (av - bv) * dir;
      });
    }
    function ariaSort(table, key) {
      const s = sorts[table];
      if (s.key !== key) return "none";
      return s.dir === 1 ? "ascending" : "descending";
    }
    function sortTh(table, key, label, extra) {
      return (
        "<th class=\\"num sort" +
        (extra ? " " + extra : "") +
        "\\" data-table=\\"" +
        table +
        "\\" data-key=\\"" +
        key +
        "\\" aria-sort=\\"" +
        ariaSort(table, key) +
        "\\">" +
        label +
        "</th>"
      );
    }
    function pctHeads(table, prefix) {
      return visiblePcts().map((k) => sortTh(table, prefix + "." + k, k)).join("");
    }
    function pctCells(b) {
      return visiblePcts().map((k) => "<td class=\\"num\\">" + num(b ? b[k] : null) + "</td>").join("");
    }
    function pctColspan() {
      return Math.max(1, visiblePcts().length);
    }
    function toggleChips(el, items, isOn, onToggle) {
      el.innerHTML = "";
      for (const item of items) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = item.label;
        b.setAttribute("aria-pressed", isOn(item) ? "true" : "false");
        b.addEventListener("click", () => onToggle(item));
        el.appendChild(b);
      }
    }
    function drawTimeline(rows) {
      const svg = document.getElementById("timeline");
      const legend = document.getElementById("legend");
      const size = bucketSize();
      const n = Math.max(1, Math.ceil(DATA.durationMs / size));
      const buckets = Array.from({ length: n }, () => []);
      let timed = 0;
      for (const r of rows) {
        const t = r[9];
        if (typeof t !== "number" || t < 0) continue;
        timed += 1;
        const i = Math.min(n - 1, Math.floor(t / size));
        buckets[i].push(r[3]);
      }
      const lines = visibleLines();
      legend.innerHTML = lines
        .map((k) => "<span><i style=\\"background:" + LINE_COLOR[k] + "\\"></i>" + k + "</span>")
        .join("");
      if (!timed) {
        svg.innerHTML =
          "<text class=\\"chart-note\\" x=\\"24\\" y=\\"130\\" fill=\\"#6b6560\\">No sample times in this run. Re-run load to plot pxx over the clock.</text>";
        return;
      }
      const points = buckets.map((ms, i) => ({
        t: i * size,
        band: band(ms.slice().sort((a, b) => a - b)),
      }));
      const yMax = Math.max(
        1,
        ...points.flatMap((p) => (p.band ? lines.map((k) => p.band[k]) : [0])),
      );
      const left = 48, top = 16, right = 16, bottom = 36;
      const w = 800 - left - right, h = 260 - top - bottom;
      const x = (t) => left + (t / Math.max(1, DATA.durationMs)) * w;
      const y = (v) => top + h - (v / yMax) * h;
      const grid = [0, 0.25, 0.5, 0.75, 1]
        .map((f) => {
          const yy = top + h * (1 - f);
          const label = Math.round(yMax * f);
          return (
            "<line x1=\\"" + left + "\\" x2=\\"" + (left + w) + "\\" y1=\\"" + yy + "\\" y2=\\"" + yy + "\\" stroke=\\"#d9d1c5\\" />" +
            "<text x=\\"" + (left - 8) + "\\" y=\\"" + (yy + 4) + "\\" text-anchor=\\"end\\" font-size=\\"11\\" fill=\\"#6b6560\\">" +
            label +
            "</text>"
          );
        })
        .join("");
      const ticks = [0, 0.5, 1]
        .map((f) => {
          const t = f * DATA.durationMs;
          return (
            "<text x=\\"" + x(t) + "\\" y=\\"" + (top + h + 22) + "\\" text-anchor=\\"middle\\" font-size=\\"11\\" fill=\\"#6b6560\\">" +
            formatBucket(t) +
            "</text>"
          );
        })
        .join("");
      const polylines = lines
        .map((k) => {
          const pts = points
            .filter((p) => p.band)
            .map((p) => x(p.t + size / 2) + "," + y(p.band[k]))
            .join(" ");
          if (!pts) return "";
          return (
            "<polyline fill=\\"none\\" stroke=\\"" +
            LINE_COLOR[k] +
            "\\" stroke-width=\\"2\\" points=\\"" +
            pts +
            "\\"/>"
          );
        })
        .join("");
      svg.innerHTML =
        grid +
        "<line x1=\\"" + left + "\\" y1=\\"" + top + "\\" x2=\\"" + left + "\\" y2=\\"" + (top + h) + "\\" stroke=\\"#161513\\" />" +
        "<line x1=\\"" + left + "\\" y1=\\"" + (top + h) + "\\" x2=\\"" + (left + w) + "\\" y2=\\"" + (top + h) + "\\" stroke=\\"#161513\\" />" +
        polylines +
        ticks +
        "<text x=\\"" + (left + w) + "\\" y=\\"" + (top + h + 22) + "\\" text-anchor=\\"end\\" font-size=\\"11\\" fill=\\"#6b6560\\">" +
        formatBucket(size) +
        " buckets</text>";
    }
    function bindSort(thead) {
      thead.querySelectorAll("th.sort").forEach((th) => {
        th.addEventListener("click", () => {
          const table = th.getAttribute("data-table");
          const key = th.getAttribute("data-key");
          const s = sorts[table];
          if (s.key === key) s.dir *= -1;
          else {
            s.key = key;
            s.dir = key === "label" || key === "sql" ? 1 : -1;
          }
          render();
        });
      });
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
      toggleChips(
        document.getElementById("pcts"),
        PCTS.map((k) => ({ id: k, label: k })),
        (item) => shown[item.id],
        (item) => {
          const on = PCTS.filter((k) => shown[k]).length;
          if (shown[item.id] && on === 1) return;
          shown[item.id] = !shown[item.id];
          render();
        },
      );
      toggleChips(
        document.getElementById("buckets"),
        BUCKETS,
        (item) => filters.bucket === item.id,
        (item) => {
          filters.bucket = item.id;
          render();
        },
      );
      const rows = filtered();
      const s = summary(rows);
      const rps = (rows.length / Math.max(0.001, DATA.durationMs / 1000)).toFixed(2);
      document.getElementById("stats").innerHTML =
        stat("Requests", s.n.toLocaleString()) +
        stat("Success", s.ok.toLocaleString()) +
        stat("Errors", s.errors.toLocaleString()) +
        stat("RPS", rps) +
        bandStats("client", s.client) +
        bandStats("wall", s.wall) +
        bandStats("db clock", s.dbSpan) +
        bandStats("db sum", s.db);
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
      drawTimeline(rows);
      const by = new Map();
      for (const r of rows) {
        const k = rowKey(r);
        const list = by.get(k);
        if (list) list.push(r);
        else by.set(k, [r]);
      }
      const sliceRows = sortRows(
        [...by.keys()].map((k) => {
          const sl = summary(by.get(k));
          return { label: k, n: sl.n, client: sl.client, wall: sl.wall, dbSpan: sl.dbSpan, db: sl.db };
        }),
        sorts.slice,
      );
      const sliceHead = document.getElementById("slice-head");
      sliceHead.innerHTML =
        "<tr>" +
        "<th rowspan=\\"2\\" class=\\"sort sticky\\" data-table=\\"slice\\" data-key=\\"label\\" aria-sort=\\"" +
        ariaSort("slice", "label") +
        "\\">Slice</th>" +
        "<th rowspan=\\"2\\" class=\\"num sort\\" data-table=\\"slice\\" data-key=\\"n\\" aria-sort=\\"" +
        ariaSort("slice", "n") +
        "\\">n</th>" +
        "<th class=\\"group\\" colspan=\\"" + pctColspan() + "\\">Client</th>" +
        "<th class=\\"group\\" colspan=\\"" + pctColspan() + "\\">Wall</th>" +
        "<th class=\\"group\\" colspan=\\"" + pctColspan() + "\\">Db clock</th>" +
        "<th class=\\"group\\" colspan=\\"" + pctColspan() + "\\">Db sum</th>" +
        "</tr><tr>" +
        pctHeads("slice", "client") +
        pctHeads("slice", "wall") +
        pctHeads("slice", "dbSpan") +
        pctHeads("slice", "db") +
        "</tr>";
      bindSort(sliceHead);
      const tbody = document.getElementById("rows");
      tbody.innerHTML = sliceRows.length
        ? sliceRows
            .map((sl) => {
              return (
                "<tr><td class=\\"sticky\\"><code>" +
                sl.label.replace(/</g, "&lt;") +
                "</code></td><td class=\\"num\\">" +
                sl.n +
                "</td>" +
                pctCells(sl.client) +
                pctCells(sl.wall) +
                pctCells(sl.dbSpan) +
                pctCells(sl.db) +
                "</tr>"
              );
            })
            .join("")
        : "<tr><td class=\\"empty\\" colspan=\\"" + (2 + pctColspan() * 4) + "\\">No requests in this filter.</td></tr>";
      const tripMs = new Map();
      for (const r of rows) {
        for (const pair of r[8] || []) {
          const sql = DATA.queries[pair[0]] || "(unknown)";
          const list = tripMs.get(sql);
          if (list) list.push(pair[1]);
          else tripMs.set(sql, [pair[1]]);
        }
      }
      const tripRows = sortRows(
        [...tripMs.keys()].map((sql) => {
          const sorted = tripMs.get(sql).slice().sort((a, b) => a - b);
          const b = band(sorted);
          return { sql, n: sorted.length, ...b };
        }),
        sorts.trip,
      );
      const tripHead = document.getElementById("trip-head");
      tripHead.innerHTML =
        "<tr>" +
        "<th class=\\"sort sticky\\" data-table=\\"trip\\" data-key=\\"sql\\" aria-sort=\\"" +
        ariaSort("trip", "sql") +
        "\\">SQL</th>" +
        sortTh("trip", "n", "n") +
        visiblePcts().map((k) => sortTh("trip", k, k)).join("") +
        "</tr>";
      bindSort(tripHead);
      const tripBody = document.getElementById("trips");
      tripBody.innerHTML = tripRows.length
        ? tripRows
            .map((t) => {
              return (
                "<tr><td class=\\"sticky\\"><code>" +
                String(t.sql).replace(/</g, "&lt;") +
                "</code></td><td class=\\"num\\">" +
                t.n +
                "</td>" +
                visiblePcts().map((k) => "<td class=\\"num\\">" + t[k] + "</td>").join("") +
                "</tr>"
              );
            })
            .join("")
        : "<tr><td class=\\"empty\\" colspan=\\"" + (2 + pctColspan()) + "\\">No trip fingerprints in this filter (deploy staging meter, then re-run).</td></tr>";
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
