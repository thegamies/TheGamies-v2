# Design system — Editorial Standings (soft brutal)

## Direction

Dark neo-editorial design with sports-standings and awards-broadcast influence, tightened by **editorial minimalism** and **soft brutalism**.

Personality comes from composition, typography, game artwork, and rank treatment — not chrome.

Visual cues were mined from the local `goty` prototype (`references/visual-prototype`) — especially CSS tokens and border language. Do **not** import that project's product scope (export video, sync dashboard, etc.).

## Gallery

Internal catalog: [`/design-system`](/design-system)

Shows tokens, type, controls (buttons, radios, year / date / time pickers, dialog), **navigation levels**, section rules, standing cards, **rank / votes / title layout settings**, horizontal scroll, covers, rank markers, **ballot** (chapter header, overlay search, category picks), skeletons, and empty/loading/error patterns as they are approved.

**Dev nav:** The account menu (and signed-out mobile drawer) includes a **Design system** link in local development and Vercel preview. Hidden on production (`VERCEL_ENV=production`). Other hosts can opt in with `SHOW_DESIGN_SYSTEM=1`.

## No one-offs

Product UI must use shared primitives from this system. If a pattern is new:

1. Land it in a reusable module under `src/components/` (or extend an existing one)
2. Document it in this file
3. Add a fixture to `/design-system`

Do **not** invent a second chip style, rank treatment, or scroll strip for a single page.

## Characteristics

- Near-black background (`--paper`)
- Warm off-white primary text (`--ink`)
- Restrained orange accent (`#ff5a1f`)
- Oversized display typography (Bebas Neue)
- Serif supporting/deck copy used sparingly (Source Serif 4)
- Body UI text: Archivo
- Hard dividers and visible structural borders (`--line`)
- Square or lightly rounded utility controls (`--radius-control: 2px`)
- Dense, readable tables
- Large artwork-led moments (cover ratio `3 / 4`)
- Strong numerical hierarchy
- Minimal shadows and interface gradients
- Flat surfaces; elevation is rare

## Soft brutalism (how we mean it)

- Prefer borders and rules over shadows and soft cards
- Blunt hierarchy and block structure without harsh “raw concrete” aesthetics
- Intentional density in standings and ballots
- Layout weight and type carry the brand

## Avoid

- Cards nested inside cards
- Rounded rectangles around every section
- Purple/blue glow, glassmorphism
- Generic feature grids
- Decorative icons beside every label
- Excessive pills and badges
- Centering every section
- Oversized marketing hero copy unrelated to content
- Generic empty-state illustrations
- Title/subtitle/icon patterns on every section
- A universal visible `Card` abstraction used everywhere
- Lone spinners that collapse layout while data loads

## Component library policy

Use Radix, React Aria, or Headless UI for behavior and accessibility only. Restyle with tokens so the kit is not identifiable by sight.

## Navigation hierarchy

Stacking identical treatments is forbidden — each level must read quieter than the one above.

| Level | Role | Look | Use |
|---|---|---|---|
| **Primary** | Community section switcher | Bordered chips inside `CommunityHeader` (`--panel` band) | Overview · Live Rankings · Events · Members · Settings |
| **Secondary** | In-page views | Underline tabs on a hairline under a **local** heading | Results: Reveal · Results · Full standings · Categories · Voters · Your ballot · Settings (hosts). Pre-publish: On the ballot / Ballot · Voters (open/closed) · Settings (hosts). Community Settings: Live Rankings · Events · Community. Site GOTY + community Live: Game of the Year · Categories |
| **Tertiary** | Board / filter | Segmented controls on one row below the Results view divider | Community / Hosts. Results: Ranked / Comparison. Dev **Debug** popover (local only) |

Shared helpers: `navItemClass()` in [`src/components/ui/navLevels.ts`](../src/components/ui/navLevels.ts). Gallery: [`/design-system`](/design-system) → Navigation + Community header.

Route progress: `NavigationProgress` — 2px `--accent` hairline at the top during App Router transitions. No spinner, no glow shadow. Mounted once in the root layout.

Rules:

- Community chrome uses `CommunityHeader`: eyebrow + name + primary chips on a `--panel` band — **no** meta between title and nav, **no** underline on the switcher
- Chips scroll horizontally on small screens (`overflow-x-auto`, no wrap, no arrow controls)
- Do **not** put secondary underlines in the community masthead (that clones Results)
- Results in-page views stay secondary underlines under the awards title (`{year} Video Game Awards`)
- Community Settings in-page views stay secondary underlines under **Settings**: Live Rankings · Events · Community
- Never stack identical primary chip rows
- Results board filters use the shared `segmentBtnClass` control group (same language as list Format), not middot text. They sit on one line below the view-tab divider. Dev-only Reveal stress tools live in a **Debug** popover on that row.
- Panel fill is for the community masthead band and interactive blocks (ballots, dialogs) — not a card wrapped around Results
- Multi-year edition switching uses `EditionYearSelect` (pop-open) to the right of `{year} Video Game Awards` — not a second underline strip. Only when 2+ public years. Year links keep the current Results view and Community · Hosts board.
- Community Settings → Events lists every year with status and host links (Edition settings / Manage hosts / Host preview). Year switching on the public event page stays `EditionYearSelect`.
- Site Game of the Year and community Live Rankings use the shared `YearSelect` control top-right of the year heading (always shown). Secondary underline tabs switch **Game of the Year** · **Categories** (`?view=`). Categories sit on their own view (cover-card chapters ordered by most votes), not stacked under GOTY. Category group filter is a single pop-open button with an **All** option; search filters chapters by name. Each chapter shows top-3 ranks in a horizontal strip, vote totals, and links to full category standings (`?view=category&category=`).
- Game detail (`/games/[slug]`): 240px cover on the left. Title, four-line description (Show more / Show less), **Broadcast compact**, site category #1s, then credits — all to the right of the cover.

## Controls

`Button` — accent / **accent-bordered** / bordered / quiet / **danger** / **danger-bordered**. Accent-bordered is the outline Create / Start a community control (orange ring and type, no fill). Danger is only for irreversible destroy (delete event). Trigger uses `danger-bordered`; the confirm action uses filled `danger`. Do not use `--accent` orange for delete. `Radio` — native radio, restyled: empty `--line` ring, `--accent` fill when selected (brand orange, not the browser default). `RadioOption` — label + optional hint row for settings. Do not use unstyled platform radios in product UI.

`DatePicker` — button trigger (no text entry) with a branded calendar mark: `--accent` header bar, `--paper` rings, `--ink` day ticks. Opens a month grid in `--panel` with a hard `--line` border. Selected day uses `--accent`; today gets an accent ring; `min` / `max` disable out-of-range days. Hidden input when `name` is set. Event schedule pairs this with `TimePicker`. Do not use native `<input type="date">` in product UI.

`YearPicker` — same trigger language, calendar mark, year number on the button. Opens a 12-year grid with prev/next and focuses the selected year. Selected year uses `--accent`; the current year gets an accent ring. `min` / `max` default 1970–2100; `disabledYears` greys out taken years. Use for create-event year, create-list year (GOTY and optional custom), and GOTY year in list settings. Do not use a number input for calendar years.

`Select` — same trigger language as the pickers, chevron on the right. Opens a scrollable listbox in `--panel`; the selected option uses `--accent`. Hidden input when `name` is set (empty values are omitted). Use for Games browse year / sort / direction / release. Games year includes **All years**, then current+2 down to 1970. Do not use a native `<select>` on Games browse.

`TimePicker` — button trigger (no text entry) with a branded clock mark. Opens hour / minute / AM·PM wheels (`TimePanel`). Value is `HH:mm`. Use when time is independent of date. Event schedule rows compose `DatePicker` + `TimePicker` plus **Set to now**.

`DateTimePicker` — button trigger (no text entry) showing date and time, branded calendar mark. Click the field or icon to open a side-by-side panel: month grid + hour / minute / AM·PM. Hour and minute are infinite vertical wheels; the selected (or current) time sits at the top on open. AM/PM is top-aligned. Time pane is only as wide as the columns. Selected day and time use `--accent`. `min` / `max` as `YYYY-MM-DDTHH:mm`. Kept for gallery / combined cases. Event schedule uses split date + time pickers instead.

`Dialog` — dimmed overlay (`bg-black/50`) + `--panel` surface with a display title and ✕ close. Escape, the close control, and clicking the dimmed edge close it. Default (`placement="modal"`): `--line` border, ink title. `tone="danger"`: `--danger` border and title. `placement="contained"`: centered like a modal, capped to the viewport (`max-h`), sticky title, scrolling body — use for tall pickers (Add categories). Confirm with filled `danger`; cancel stays bordered. Event delete also requires typing the year. Do not invent a second modal chrome.

`CookieConsentBanner` — compact `--panel` card with a hard `--line` border, **fixed bottom-right** (`z-40`, under `Dialog` at `z-[60]`). Safe-area padding. Accept (accent) / Reject (bordered). Not a full-width bottom bar. `preview` renders in-flow for the gallery.

## Section rule

`SectionRule` — accent tick + muted hairline spanning the full content width (tick shrink-0, hairline `flex-1`). Used for edition and live category chapter breaks. Prefer this over a plain `border-t` when the break should feel ceremonial. Place the rule at article/section width — not inside a narrow flex column — so the hairline reads full-bleed within the page rail.

## Standing cards + rank

`StandingGameCard` — cover + title (+ optional pts/year meta). Equal scores share a **displayed rank** from the event’s numbering setting (competition 1–1–3 or dense 1–1–2). Stored freeze `place` is board order only.

When **scores are shown** (`points`), accent place stays **in front of the title** and pts/votes **hug the last title line** (no reserved 2-line block). Year (if any) sits on that same meta line. When scores are hidden, accent place stays **in front of the title** — never a badge on the art.

| Context | Rank treatment |
|---|---|
| GOTY podium | Large `RankMarker` **above** cover; cover **bottoms** share a baseline (all rank-1 games use winner size) |
| GOTY / category Reveal | Sticky scroll ceremony (default tab). GOTY #10→#1: number parks right on the Tied row; **tied ranks share one stage** — Tied lifts, then each cover in turn. Categories: `#1 · #2 · #3` columns in one board; each slides in from off-screen left (**#3→#2→#1**) and packs so earlier ranks push right; multi-row tied mosaics with titles. Short viewports raise the parked rank/Tied and scale covers so tiles stay below the chapter header. Not standings cards. `prefers-reduced-motion` skips scrubbing |
| GOTY Ranked | Wrapping grid (no horizontal scroll); **large** display place in front of the title; pts hug the last title line. GOTY Top 10 even grid. Row gap matches column gap. |
| GOTY / category Comparison strips | No place on the card (column headers name the source). Cover `MATRIX_COVER` below `lg`, `MATRIX_COVER_WIDE` (podium size) from `lg`. Titles start at **18px** (same as standings cards) and shrink toward 12px. Tie stacks follow the event’s competition or dense numbering |
| Category Ranked | One line per award; `HorizontalScroll` when displayed rank ≤ 3 overflows (full ties). Place in front of the title; votes hug the last title line; #1 slightly wider than #2/#3. Cover **bottoms** share a baseline (a wrapped title cannot lift the art). |
| Rest of Top 10 / Full standings / Live (scores hidden) | Accent place **in front of the title** (tight `gap-1`). Live site GOTY + community Live Rankings use the same `StandingGameCardGrid` as edition full standings. Row gap matches column gap. |
| Live GOTY / Categories (scores revealed) | Rank in front of the title; pts/votes hug the last title line. Category chapters: tick+hairline rule, title + quiet “Full standings” link on one baseline row. |

Titles use `FitDisplayTitle` (clamp to 2 lines; shrink toward 12px). Score cards use `reserve={false}` so pts/votes sit tight under a 1- or 2-line title. Wrapping cover grids use equal row and column gap (`gap-4`, or `gap-3` on tight live boards and ballot/ranked grids).

Gallery **Rank · votes · title** lets you compare score layouts on `StandingGameCard` (`rankScoreLayout`). Product ships **Votes under title**. A **Year** setting hides the release year.

## Horizontal scroll

`HorizontalScroll` — intentional sideways strips (Rest of Top 10 on small screens, GOTY / category Comparison strips, category Ranked Top 3). Category Reveal slides its own #3→#2→#1 columns via scrub instead. Not used for GOTY Ranked (wrapping grid).

- Hide scrollbars; edge fade + quiet accent hairline when more content exists
- Desktop: drag-to-pan (click still works after a short move); optional prev/next via `showArrowControls` (off by default)
- Do **not** remap vertical wheel to horizontal
- Optional `stickyHeader` mirrors body scroll (one-way); no nested vertical scrollport
- Optional `HorizontalScrollGroup` keeps sibling strips on the same `scrollLeft` (GOTY Comparison rank rows)

## Bespoke identity components

Shipped: `GameCover`, `RankMarker`, `Button`, `Radio` / `RadioOption`, `YearPicker` / `DatePicker` / `TimePicker` / `DateTimePicker`, `Select`, `Dialog`, skeleton family, `SectionRule`, `HorizontalScroll`, `FitDisplayTitle`, `navLevels`, `YearSelect`, `NavigationProgress`, `StandingGameCard` / `WinnerPodium`, `RankedStandingBillboard`, `BallotRankGrid`, `CommunityHeader` / `CommunityNav`, `CommunityEventsOverview`, `EditionSectionHeader`, `EditionRevealView`, `EditionGotyHighlights` / `EditionCategoriesHighlights`, `LiveStandingsBoard` / `LiveCategoriesPanel`, `BallotChapterHeader`, `GameSearchField`, `CategoryPickCard` / `CategoryVoteHeading`, `CategoryVotesEditor`, `PinnedSaveBar`, `CookieConsentBanner`, list `ShareMenuDialog` / `SaveSignInDialog` / `ShareLinkSignInDialog`.

Planned: `EventNavigation`, `WinnerReveal`, `FinalStandings`, `ResultSourceSelector`, `GameVoteBreakdown`, `IndividualBallot`, `CategoryResult`, `VoterBreakdown`, `CommunityMemberRow`

## Ballot

Open voting uses the same primitives on events and personal GOTY lists.

| Piece | Role |
|---|---|
| `BallotChapterHeader` | Eyebrow + display title + optional deck / actions. GOTY: **Top 10** / Game of the Year. Categories: **Categories** / Award picks |
| `GameSearchField` | Search input; results **overlay** following content (border + `--panel`, no shadow). Open field raises `z-index` so the menu sits above sibling rows |
| GOTY ranking | Wrapping cover grid (`BallotRankGrid`); place in front of the title; hold to reorder while open; cap 10. Closed / Your ballot uses the same grid |
| `CategoryVoteHeading` | Display category name (`text-2xl`) + optional description |
| `CategoryPickCard` | Large cover (`w-28` / `sm:w-32`) + heading + picked title + optional **Clear** |
| `CategoryVotesEditor` | Award picks editor. **Site GOTY** (`catalogMode="optional"`, default): search + group filter + **Add category** dialog. **Edition ballots** (`catalogMode="fixed"`): every event award is listed; no add/remove. Empty slot + `GameSearchField`, or `CategoryPickCard`. List editor may pass `locked` + sign-in CTA for signed-out visitors. |
| `CategoryPickerGrid` | Shared award grid: search + group filter + square tiles. **Site GOTY** Add-category dialog: unused awards, select adds and closes. **Create event / Edition settings** contained dialog: full catalog, selected tiles stay with **Added**, tap again to unselect; dialog stays open for multi-select. |
| `PinnedSaveBar` | After an edit: `--panel` band pinned to the viewport bottom with Save. Hidden when clean. List editor, edition ballot, and **Edition settings** reuse this — do not invent a second sticky save. |
| Leave guard | `useUnsavedChangesGuard` — in-app **Unsaved changes** dialog (Stay / Leave). Tab close uses the browser prompt |

Do not invent a second search dropdown, a smaller one-off category thumbnail, or a second sticky save treatment.

## Tokens

Defined in `src/app/globals.css` and wired through Tailwind `@theme`.

| Token | Role | Value |
|---|---|---|
| `--paper` | Page background | `#0d0d0e` |
| `--panel` | Raised / inset surface | `#151516` |
| `--ink` | Primary text | `#f4f0e8` |
| `--muted` | Secondary text | `#aaa69e` |
| `--line` | Borders / dividers | `#2b2a28` |
| `--accent` | Rank, selection, status | `#ff5a1f` |
| `--danger` | Irreversible destroy | `#c7372a` |
| `--radius-control` | Buttons / inputs | `2px` |
| `--radius-artwork` | Covers | `0px` |
| `--cover-ratio` | Game art | `3 / 4` |
| `--page-max` | Content width | `72rem` |
| `--gutter` | Page padding | `1.5rem` |
| `--page-pad-y` | Vertical pad under site header | `1.5rem` |
| `--standing-fill-gap` | Gap between fill-row standing cards | `1rem` |
| `--standing-fill-min-visible` | Covers in view on a narrow fill-row (decimals peek) | `2.2` (admin, temporary) |
| `--standing-fill-card-max` | Fill-row card width at `--page-max` (5-up) | derived |
| `--standing-fill-card` | Fill-row card width | `min` of max and visible-count size |

Rules:

- Orange communicates selection, rank, or event status
- `--danger` is only for irreversible destroy (delete event) — not schedule warnings or form errors elsewhere
- Artwork uses a consistent cover ratio
- Data sections prefer dividers and spacing over visible containers
- New colors, radii, shadows, and spacing require a deliberate system change

## Skeletons

Any client-loaded block with a known final shape must ship a matching skeleton. Prefer `Skeleton`, `SkeletonText`, `SkeletonCover`, `SkeletonBallotRow`, and `SkeletonStandingsRow` over spinners.

Skeletons use `--panel` / `--line`, hard edges, and a light pulse — not shimmer gradients that feel like SaaS dashboards.

## Responsive

- Minimum layout width we design for: **360px** (phone)
- Desktop (~1440): editorial width, pinned table identifiers when scrolling horizontally
- Tablet (~1024) / Mobile (~390): focused segmented views for Combined / Community / Hosts / Ballots; no two-axis navigation for core comprehension
- Horizontal strips (GOTY / category Comparison, category Ranked): hide scrollbars; edge fade when more content; desktop drag-to-pan (click still works — drag starts after a short move). Arrow controls optional (`showArrowControls`, off by default). Touch/trackpad native scroll. Do not remap vertical wheel to horizontal. Comparison strips keep headers with each chapter’s table. GOTY Ranked must fit 360 without sideways scroll.
- Homepage / all-years GOTY strips: card width is `min(--standing-fill-card-max`, visible-count size). `--standing-fill-min-visible` (temporary admin setting, decimals allowed) keeps at least that many covers in view and peeks the next; a wide screen still fits five.
- Homepage **Big Picture** hero: cover marquees sit under a transparent site nav; tagline + Browse games / Communities overlay the bottom of the wall. Covers from IGDB catalog **popularity** for the current and previous year (same sort as `/games`). Soft side/bottom fade into paper (no hard rule); pauses under `prefers-reduced-motion`.

## Fixtures that mocks must cover

Long game names, missing art, long usernames/community names, partial and full ballots, ties, zero-vote categories, many nominees, 15 voters and very large voter sets, one vs many Hosts, loading/empty/error/submitted/locked states.
