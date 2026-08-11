# Lists

Personal **GOTY** and **custom** ranked lists. Separate from edition ballots and live aggregates.

## Concepts

| Term | Meaning |
|---|---|
| Draft cookie | Client-writable cookie (`tg_list_draft`) with ordered IGDB ids + meta; auto-updated while building |
| Edit cookie | httpOnly `tg_list_edit` (`publicId.secret`) set after Share for anonymous edit access |
| Published | Public at `/l/[publicId]`; crawlable share page |
| Claim | Attach an anonymous shared list to a signed-in profile |

## Flow

1. `/create` → pick GOTY or custom → builder opens **without** a database row.
2. Ranking auto-persists to the draft cookie (device-local). Resume from `/create`.
3. Toolbar:
   - **Save** — signed-in only; upserts an owned list on the account. Anonymous users are told to sign in (cookie already keeps the draft).
   - **Share** — creates/updates a published Postgres list, sets the edit cookie for anon, opens `/l/[publicId]`.
   - **Export** — JPEG poster from current client state (no DB required).
4. Soft prompt on the share page: sign in to save; **Don’t prompt again** uses `localStorage`.
5. **Claim** sets `profileId`, assigns a slug (`goty-{year}` or slugified title), clears the edit secret.
6. **Reset** clears the draft cookie (and deletes a DB draft if an edit cookie still points at one).

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
- One **owned** GOTY list per profile per year (save/claim fails clearly if one already exists).
- Default aggregate scoring uses **top 10 only** (`pointsForRank`); live boards are a later phase.
- Cookie drafts store **IGDB ids**; Postgres keeps uuid game PKs.

## URLs

- Create: `/create`, `/create/goty`, `/create/custom`
- Share (canonical): `/l/[publicId]`
- Profile shows published lists linking to the same share URL

## Non-goals (this feature)

- Live site/community aggregates
- Video / Remotion export
- Editing an anonymous list from another browser without the edit cookie
