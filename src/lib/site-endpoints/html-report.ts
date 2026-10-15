import {
  GROUP_LABEL,
  SITE_ENDPOINTS,
  TEST_PRIORITY_LABEL,
  compareEndpointsForTest,
  endpointCoverage,
  type SiteEndpoint,
} from "./catalog";

const SCALE = ["", "Low", "Modest", "Medium", "High", "Peak"] as const;

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function formatEndpointsHtml(
  rows: SiteEndpoint[] = SITE_ENDPOINTS,
): string {
  const ranked = [...rows].sort(compareEndpointsForTest);
  const payload = ranked.map((row) => ({
    method: row.method,
    path: row.path,
    kind: row.kind,
    group: row.group,
    groupLabel: GROUP_LABEL[row.group],
    audience: row.audience,
    usage: row.usage,
    dbImpact: row.dbImpact,
    testPriority: row.testPriority,
    priorityLabel: TEST_PRIORITY_LABEL[row.testPriority],
    cacheEase: row.cacheEase,
    cacheComplexity: row.cacheComplexity,
    cacheNotes: row.cacheNotes,
    notes: row.notes,
    loadMix: Boolean(row.loadMix),
    coverage: endpointCoverage(row).label,
    cacheFirst: Math.round(
      (row.usage * row.dbImpact * row.cacheEase) / row.cacheComplexity,
    ),
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Routes · cache and test</title>
  <style>
    :root {
      --bg: #121110;
      --ink: #efe8dc;
      --muted: #9a938a;
      --line: #3a3530;
      --card: #1c1a18;
      --accent: #e07070;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.45 "Source Serif 4", Georgia, serif;
      background: var(--bg);
      color: var(--ink);
    }
    header, .filters { max-width: 1280px; margin: 0 auto; padding: 1.5rem 1.25rem 0; }
    main { max-width: 1280px; margin: 0 auto; padding: 0 1.25rem 2.5rem; }
    h1 { font: 700 1.75rem/1.15 "Archivo", system-ui, sans-serif; letter-spacing: 0.02em; margin: 0 0 0.35rem; }
    .meta { color: var(--muted); font-size: 0.92rem; }
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
    .table-scroll {
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid var(--line);
      background: var(--card);
    }
    table { width: max-content; min-width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.45rem 0.55rem; border-bottom: 1px solid var(--line); font-size: 0.85rem; vertical-align: top; }
    th { font: 600 0.68rem/1.2 "Archivo", system-ui, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
    th.sort { cursor: pointer; user-select: none; }
    th.sort:hover { color: var(--ink); }
    th.sort[aria-sort="ascending"]::after { content: " ↑"; color: var(--accent); }
    th.sort[aria-sort="descending"]::after { content: " ↓"; color: var(--accent); }
    td.path { font-family: ui-monospace, Consolas, monospace; white-space: nowrap; }
    td.why, td.cache { white-space: normal; min-width: 14rem; color: var(--muted); }
    td.num { font-variant-numeric: tabular-nums; }
    .mix { display: block; margin-top: 0.2rem; font: 600 0.65rem/1 "Archivo", system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>Routes</h1>
    <p class="meta">Use is traffic. Database is Neon work per hit. Covered is what we already run: the staging load mix, unit tests, or Playwright. Not yet means no automated coverage recorded for this row. Cache easy is how readily this GET fits OpenNext incremental cache on R2 (public, few keys). Cache hard is invalidation — especially a person saving a list, library row, or Pick’em sheet. Cache first is use × database × easy ÷ hard — sort that column to pick R2 work. Scores are editorial.</p>
  </header>
  <div class="filters">
    <fieldset>
      <legend>Test order</legend>
      <div class="chips" id="priorities"></div>
    </fieldset>
    <fieldset>
      <legend>Area</legend>
      <div class="chips" id="groups"></div>
    </fieldset>
    <fieldset>
      <legend>Covered</legend>
      <div class="chips" id="coverage"></div>
    </fieldset>
  </div>
  <main>
    <div class="table-scroll">
      <table>
        <thead>
          <tr id="head"></tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </main>
  <script>
    const DATA = ${jsonForScript(payload)};
    const SCALE = ${jsonForScript([...SCALE])};
    const ALL = "all";
    const COLS = [
      { key: "path", label: "Route", kind: "text" },
      { key: "usage", label: "Use", kind: "scale" },
      { key: "dbImpact", label: "Database", kind: "scale" },
      { key: "testPriority", label: "Test", kind: "num" },
      { key: "coverage", label: "Covered", kind: "text" },
      { key: "cacheEase", label: "Cache easy", kind: "scale" },
      { key: "cacheComplexity", label: "Cache hard", kind: "scale" },
      { key: "cacheFirst", label: "Cache first", kind: "num" },
      { key: "cacheNotes", label: "Cache why", kind: "text" },
      { key: "notes", label: "Why", kind: "text" },
    ];
    const filters = { priority: ALL, group: ALL, coverage: ALL };
    const sort = { key: "cacheFirst", dir: -1 };

    function chips(el, values, key) {
      el.innerHTML = "";
      for (const value of [ALL, ...values]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = value === ALL ? "All" : String(value);
        b.setAttribute("aria-pressed", filters[key] === value ? "true" : "false");
        b.addEventListener("click", () => {
          filters[key] = value;
          render();
        });
        el.appendChild(b);
      }
    }

    function cmp(a, b) {
      const ka = a[sort.key];
      const kb = b[sort.key];
      const n = typeof ka === "number" && typeof kb === "number"
        ? ka - kb
        : String(ka).localeCompare(String(kb));
      return n * sort.dir;
    }

    function renderHead() {
      const tr = document.getElementById("head");
      tr.innerHTML = "";
      for (const col of COLS) {
        const th = document.createElement("th");
        th.className = "sort";
        th.textContent = col.label;
        th.setAttribute("aria-sort", sort.key === col.key ? (sort.dir > 0 ? "ascending" : "descending") : "none");
        th.addEventListener("click", () => {
          if (sort.key === col.key) sort.dir *= -1;
          else { sort.key = col.key; sort.dir = col.kind === "text" ? 1 : -1; }
          render();
        });
        tr.appendChild(th);
      }
    }

    function tdScale(n) {
      const td = document.createElement("td");
      td.className = "num";
      td.textContent = SCALE[n] + " (" + n + ")";
      return td;
    }

    function render() {
      const prios = [...new Set(DATA.map((r) => r.priorityLabel))];
      const groups = [...new Set(DATA.map((r) => r.groupLabel))];
      const covered = [...new Set(DATA.map((r) => r.coverage))].sort();
      chips(document.getElementById("priorities"), prios, "priority");
      chips(document.getElementById("groups"), groups, "group");
      chips(document.getElementById("coverage"), covered, "coverage");
      renderHead();
      const tbody = document.getElementById("rows");
      tbody.innerHTML = "";
      const shown = DATA.filter((r) => {
        if (filters.priority !== ALL && r.priorityLabel !== filters.priority) return false;
        if (filters.group !== ALL && r.groupLabel !== filters.group) return false;
        if (filters.coverage !== ALL && r.coverage !== filters.coverage) return false;
        return true;
      }).sort(cmp);
      for (const r of shown) {
        const tr = document.createElement("tr");
        const pathTd = document.createElement("td");
        pathTd.className = "path";
        const method = document.createElement("b");
        method.textContent = r.method === "action" ? "Save" : r.method;
        pathTd.appendChild(method);
        pathTd.appendChild(document.createTextNode(" " + r.path));
        if (r.loadMix) {
          const mix = document.createElement("span");
          mix.className = "mix";
          mix.textContent = "In the traffic mix";
          pathTd.appendChild(mix);
        }
        tr.appendChild(pathTd);
        tr.appendChild(tdScale(r.usage));
        tr.appendChild(tdScale(r.dbImpact));
        const test = document.createElement("td");
        test.className = "num";
        test.textContent = r.priorityLabel;
        tr.appendChild(test);
        const coveredTd = document.createElement("td");
        coveredTd.textContent = r.coverage;
        tr.appendChild(coveredTd);
        tr.appendChild(tdScale(r.cacheEase));
        tr.appendChild(tdScale(r.cacheComplexity));
        const first = document.createElement("td");
        first.className = "num";
        first.textContent = String(r.cacheFirst);
        tr.appendChild(first);
        const cache = document.createElement("td");
        cache.className = "cache";
        cache.textContent = r.cacheNotes;
        tr.appendChild(cache);
        const why = document.createElement("td");
        why.className = "why";
        why.textContent = r.notes;
        tr.appendChild(why);
        tbody.appendChild(tr);
      }
    }
    render();
  </script>
</body>
</html>`;
}
