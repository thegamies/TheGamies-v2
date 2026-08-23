# Lists

Personal **GOTY** and **custom** ranked lists. Separate from edition ballots and live aggregates.

## Concepts

| Term | Meaning |
|---|---|
| Draft cookie | Anon-only client cookie (`tg_list_draft`) with ordered IGDB ids + meta; auto-updated while building |
| Edit cookie | httpOnly `tg_list_edit` (`publicId.secret`) for legacy anonymous `/l/` edit access |
| Owned list | Attached to a profile (`profileId` + `slug`); canonical URL `/u/[username]/[slug]` |
| Anon share (legacy) | Older DB rows without profile at `/l/[publicId]` until claimed |
| Claim | Attach a legacy anonymous shared list to a signed-in profile (assigns slug) |

Lists have **no draft/published status**. If a row exists in Postgres, it is shareable.

## Flow

### Signed in

1. Start GOTY or custom → **creates and attaches a list to the account immediately** (profile + slug).
2. GOTY: if the profile already has that year, stay on the year picker and show that list’s top 5 with **Edit** on the title row. On entry, the default selected year is fetched immediately (picker stays closed).
3. Cookie drafts are not used (except one-shot restore after sign-in with `intent`, and only when that year is not already owned). **Save** updates rankings. **Share** opens a menu: **Share as image** (client JPEG) or **Share with a link** (publish → `/u/[username]/[slug]`).


### Signed out

1. Start GOTY or custom → builder opens **without** a database row.
2. Ranking auto-persists to the draft cookie (this device only).
3. Visiting Create with an unfinished cookie asks: **Continue editing** or **Start a new list** (warns the unfinished ranking will be lost). Type chooser is hidden until they decide.
4. Toolbar shows only **Save** and **Share** (no top-level Export):
   - **Save** — dialog: sign in to save to profile (GOTY also counts toward rankings). Draft stays on device.
   - **Share** — menu:
     - **Share as image** — everyone; downloadable/shareable JPEG; does not save or rank.
     - **Share with a link** — requires sign-in; dialog prompts to sign in & share, share as image instead, or cancel.
5. After authentication with `intent=save` or `intent=share`, restore the draft, attach/save the owned list, then stay in the editor (save) or open the owned share URL (share). If the account **already has** a GOTY list for that year, the local draft is discarded (cookie and this-device storage) and the existing owned list opens (`/create/goty?id=…`). The unsigned ranking is not restored or saved onto the account. Header Sign in without intent does the same discard when that year is already owned. Custom lists are unchanged (many per account).
6. Soft prompt on **legacy** `/l/` pages: sign in to claim; **Don’t prompt again** uses `localStorage`.
7. **Claim** sets `profileId`, assigns a slug (`goty-{year}` or slugified title), clears the edit secret, redirects to `/u/[username]/[slug]`.

### Core product rule

Anyone can create and share an image. Signed-in users can save, publish share links, and contribute GOTY lists to rankings. The editor does **not** create new anonymous `/l/` rows.

## Builder

Create UI mirrors the Social Gamer Card prototype:

- Poster, List, or **Grid** format (Grid uses the standings cover grid and standings title type)
- **GOTY Poster** size presets (5 / 10 / 20 / 50, max 100). Size is hidden on List and Grid. Shrinking the poster does not drop games; extras stay on the ranking and the poster notes how many are hidden.
- Rank chrome: Banner / Chip / Off (+ ordinal suffix) in settings
- Optional per-game notes (blurbs) — **signed-in only**, max **500** characters
- GOTY builder heading is `{year} Game of the Year` in body ink (no Title field). Custom lists keep an editable Title.
- Hold briefly to reorder (scroll is blocked while holding so the page does not steal the gesture). List format: six-dot handle on the right of each row. Poster/Grid: tap a game to open an external **Remove** popover (ink-contrast border, design-system danger button) that points at the card; tap elsewhere to dismiss. List keeps a text **Remove** control beside the title.
- Signed-in owners can **Delete list** from the editor (danger confirm). GOTY lists also leave the live board. Redirects to the profile Lists tab. Deleting the **account** removes every owned list the same way.
- Image export via **Share → Share as image** on GOTY ranking view (JPEG poster). Rank style (banner / chip / off + suffix) and **default view** (Grid / List / Poster; new lists default to Grid) are saved on the list. The public list page uses that default and lets anyone switch formats.
- **Settings** (rank style) only on Poster, not on List/Grid or the Categories tab.
- List **size** is a Poster layout control on GOTY (how many covers the poster shows). Changing it is not an unsaved edit. List and Grid show the full ranking. Switching format is preview-only until **Default view** is checked.
- Signed-in **Done** (and **Share with a link**) asks to save if there are unsaved changes, then opens the public list.
- Categories Share is **link only**. Share menu opens from the Share button. Signed out: **Share with a link** shows Sign in required, then Sign in / Create account only (same two options for Save).
- **Save** stays in the toolbar. Signed-in unsaved edits also show a floating **Save** bar (including category picks).

## Rules

- Up to **100** ranked games; ranks are contiguous 1..n.
- GOTY: year required; games should match year / be released (enforced in domain rules).
- One **owned** GOTY list per profile per year (year picker stays put and shows top 5 + Edit list when that year already exists; claim/save fail clearly otherwise).
- Default aggregate scoring uses **top 10 only** (`pointsForRank`); owned GOTY lists feed the site live board via `live_goty_contrib` (see [live-aggregate.md](./live-aggregate.md)).
- Cookie drafts store **IGDB ids**; Postgres keeps uuid game PKs.
- Owned GOTY lists may include **one game per site award category** (signed-in only to pick). The Categories tab is visible when signed out with a sign-in prompt. Category picks live on a **Categories** tab beside **Game of the Year** in the builder (title above tabs; Format/Size hidden on Categories).

## URLs

- Create: `/create`, `/create/goty`, `/create/custom`
- Owned share (canonical): `/u/[username]/[slug]` (e.g. `/u/alex/goty-2026`). GOTY lists use secondary tabs **Game of the Year** (default) and **Categories** (`?view=categories`). Categories loads only that list’s picks (not the full award catalog). **Edit** on Categories opens `/create/goty?id=…&view=categories`. Switching tabs in the GOTY editor updates the same `?view=` query. Custom lists have no tabs.
- Legacy anon share: `/l/[publicId]` (owned publicId URLs redirect to the slug URL)
- Sign-in to complete Save/Share: `/auth/sign-in?next=...&intent=save|share` (create account uses the same `next` / `intent`). After sign-up, confirm email (link in the message, or a code). The save/share `next` is kept so the user returns to the list. General auth return: after sign-in or sign-up, users go to safe `next` when present (header Sign in passes the current page); otherwise `/account`.
- Profile lists link to the owned slug URL
- Profile `/u/[username]`: secondary tabs **Lists** (default) and **Communities** (`?tab=communities`). Lists shows every owned list (GOTY and custom) with a SQL-capped top-5 cover strip (12 lists per page, `?page=`). Header **My Lists** / **My Communities** deep-link those tabs.
- Site live standings: `/game-of-the-year`, `/game-of-the-year/[year]`. Homepage and `/standings` year strips link the year and **Top Categories** into the year board (display type, hover accent). `/standings` has a right-pinned **All** popover. Year boards use the same public-year list (enough GOTY lists or at least one public category). Bordered **Full Standings** / **Create list** / **My list** sit on the year row; **See All** / **Make picks** / **My picks** sit on Top Categories. Years with no public category highlights still show Top Categories and a centered empty with a bordered add-categories control. Year boards put the creator copy next to the list total (list CTA on GOTY, categories CTA on Categories). Unsigned visitors always get create/make picks; signed-in owners get my list/my picks when they already have a GOTY list for that year.

## Non-goals (this feature)

- Live site/community aggregate **UI** beyond wiring owned GOTY into contrib (standings live under live-aggregate)
- Video / Remotion export
- Editing an anonymous list from another browser without the edit cookie
