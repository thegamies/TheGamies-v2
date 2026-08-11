# Lists

Personal **GOTY** and **custom** ranked lists. Separate from edition ballots and live aggregates.

## Concepts

| Term | Meaning |
|---|---|
| Draft cookie | Anon-only client cookie (`tg_list_draft`) with ordered IGDB ids + meta; auto-updated while building |
| Edit cookie | httpOnly `tg_list_edit` (`publicId.secret`) set after Share for anonymous edit access |
| Owned list | Attached to a profile (`profileId` + `slug`); canonical URL `/u/[username]/[slug]` |
| Anon share | DB row without profile; URL `/l/[publicId]` until claimed |
| Claim | Attach an anonymous shared list to a signed-in profile (assigns slug) |

Lists have **no draft/published status**. If a row exists in Postgres, it is shareable.

## Flow

### Signed in

1. Start GOTY or custom → **creates and attaches a list to the account immediately** (profile + slug).
2. GOTY: if the profile already has that year, open the existing list instead of creating a second one.
3. Cookie drafts are not used. Save updates rankings; Share opens `/u/[username]/[slug]`; Export is client-side.

### Signed out

1. Start GOTY or custom → builder opens **without** a database row.
2. Ranking auto-persists to the draft cookie (this device only).
3. Visiting Create with an unfinished cookie asks: **Continue editing** or **Start a new list** (warns the unfinished ranking will be lost). Type chooser is hidden until they decide.
4. Toolbar:
   - **Save** — prompts to sign in (cookie already keeps the draft).
   - **Share** — creates/updates a Postgres list, sets the edit cookie, opens `/l/[publicId]`.
   - **Export** — JPEG poster from current client state (no DB required).
5. Soft prompt on the share page: sign in to save; **Don’t prompt again** uses `localStorage`.
6. **Claim** sets `profileId`, assigns a slug (`goty-{year}` or slugified title), clears the edit secret, redirects to `/u/[username]/[slug]`.

## Builder

Create UI mirrors the Social Gamer Card prototype:

- Poster or List format
- Size presets (5 / 10 / 20 / 50, max 100)
- Rank chrome: Banner / Chip / Off (+ ordinal suffix)
- Optional per-game notes (blurbs) — **signed-in only**
- Drag-and-drop reorder
- Image export (JPEG poster)
- Warnings when shrinking size or switching year/GOTY would drop games (and notes)

## Rules

- Up to **100** ranked games; ranks are contiguous 1..n.
- GOTY: year required; games should match year / be released (enforced in domain rules).
- One **owned** GOTY list per profile per year (create opens the existing list; claim/save fail clearly otherwise).
- Default aggregate scoring uses **top 10 only** (`pointsForRank`); live boards are a later phase.
- Cookie drafts store **IGDB ids**; Postgres keeps uuid game PKs.

## URLs

- Create: `/create`, `/create/goty`, `/create/custom`
- Owned share (canonical): `/u/[username]/[slug]` (e.g. `/u/alex/goty-2026`)
- Anon share: `/l/[publicId]` (owned publicId URLs redirect to the slug URL)
- Profile lists link to the owned slug URL

## Non-goals (this feature)

- Live site/community aggregates
- Video / Remotion export
- Editing an anonymous list from another browser without the edit cookie
