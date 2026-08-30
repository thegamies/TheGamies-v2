# Request cost — efficient reads and writes

How we choose data paths so a page stays cheap as the product grows. Applies to **every** surface: public boards, ballots, settings, host tools, admin. “Operators are few” or “we’ll filter in the UI” does not exempt a query.

Cursor rule: `.cursor/rules/request-cost.mdc`. Short form also in [engineering.md](./engineering.md).

## The question

Before you load, freeze, cache, or search, ask how the **hot path** behaves—not only what the UI shows.

1. **DB egress** — Bytes from Neon to the app per request. Does this view pull a whole table, roster, or blob to render a page?
2. **Compute** — Parse/serialize and memory on Cloudflare Workers for that payload.
3. **Scale** — At 10× members, voters, games, or traffic, is the same pattern still cheap?

If the answer is “load everything, then slice,” the design is wrong.

## Lists

**Never load an unbounded list** without SQL `LIMIT` / `OFFSET` (or keyset) on the read path.

| Do | Don’t |
|---|---|
| Query the page you will render | `SELECT` every row, then paginate in JS/React |
| Cap default views (current Hosts, first page, recent hits) | Ship the full roster “because the dropdown/search needs it” |
| Same rules on settings/admin as on public boards | “Hosts will scroll; membership stays small” |

The client receives **only the rows it paints**. A 50-row page is 50 rows over the wire—not 5,000 with 50 displayed.

## Search is SQL, not a client filter

A search box that filters an already-downloaded list is **not search**. It is a filter, and it forces an unbounded load on every page view.

**Do**

- Default state: a small, purposeful set (e.g. current Hosts + community hosts), still `LIMIT`ed
- Typing: server query (`ILIKE` / indexes) with a **hit cap** (typically 20)
- Blank query: return no search hits; show the default set—do not dump the catalog
- Debounce typeahead; do not refetch the full collection

**Don’t**

- Load all members/games/awards into the client so the input can `includes()` locally
- Use `getAll` + `array.filter` as the search implementation
- Grow the payload because “search needs to see everything”

## Writes

A small mutation (add/remove one Host, one category) should not pay for a large read.

- Persist the row; **optimistic UI** when the next paint is obvious
- Revalidate **the routes that show that row**, not the entire community (live, members, ballot, results, profile, …)
- After save, reload a **page-sized** list—not the unbounded collection you just forbade on first load

Neon HTTP is roughly **one round trip per query**. Serial `await`s stack. Don’t add extra community/edition/member fetches if you already have ids.

## Freeze and snapshots

Live lock and edition results freeze into **tables of rows**, not one giant JSON payload you parse to serve 50 standings. Page those rows in SQL. See [community.md](./features/community.md) and [engineering.md](./engineering.md).

## Checklist (use on every list/search)

- [ ] What is the maximum rows this request can return? Is there a `LIMIT`?
- [ ] If membership/catalog is 10×, does this page still transfer a bounded payload?
- [ ] Is “search” a SQL query, or a filter over a full dump?
- [ ] Does a one-row write refetch an unbounded list or revalidate unrelated routes?
