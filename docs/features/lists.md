# Lists

Personal **GOTY** and **custom** ranked lists. Separate from edition ballots and live aggregates.

## Concepts

| Term | Meaning |
|---|---|
| Draft | Server-persisted list not yet public; only editable with edit cookie or owner session |
| Published | Public at `/l/[publicId]`; crawlable share page |
| Claim | Attach an anonymous list to a signed-in profile |

## Flow

1. `/create` → GOTY or custom editor creates a **draft** in the database and sets an httpOnly edit cookie (`publicId` + secret).
2. Leaving and returning resumes the draft via that cookie (list rows live in DB; the cookie is not the payload).
3. **Publish** flips status to published and opens the editorial share view.
4. Soft prompt: sign in to save; **Don’t prompt again** uses `localStorage`.
5. **Claim** sets `profileId`, assigns a slug (`goty-{year}` or slugified title), clears the edit secret.
6. **Reset** deletes the draft (and items), clears the cookie, starts fresh.

## Builder

Create UI mirrors the Social Gamer Card prototype:

- Poster or List format
- Size presets (5 / 10 / 20 / 50, max 100)
- Rank chrome: Banner / Chip / Off (+ ordinal suffix)
- Optional per-game notes (blurbs) on List format and the share page
- Drag-and-drop reorder
- Image export (JPEG poster)
- Warnings when shrinking size or switching year/GOTY would drop games (and notes)

## Rules

- Up to **100** ranked games; ranks are contiguous 1..n.
- GOTY: year required; games should match year / be released (enforced in domain rules).
- One **owned** GOTY list per profile per year (claim fails clearly if one already exists).
- Default aggregate scoring uses **top 10 only** (`pointsForRank`); live boards are a later phase.

## URLs

- Create: `/create`, `/create/goty`, `/create/custom`
- Share (canonical): `/l/[publicId]`
- Profile shows published lists linking to the same share URL

## Non-goals (this feature)

- Live site/community aggregates
- Image / video export
- Editing an anonymous list from another browser without the edit cookie
