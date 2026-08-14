# Design system — Editorial Standings (soft brutal)

## Direction

Dark neo-editorial design with sports-standings and awards-broadcast influence, tightened by **editorial minimalism** and **soft brutalism**.

Personality comes from composition, typography, game artwork, and rank treatment — not chrome.

Visual cues were mined from the local `goty` prototype (`references/visual-prototype`) — especially CSS tokens and border language. Do **not** import that project's product scope (export video, sync dashboard, etc.).

## Gallery

Internal catalog: [`/design-system`](/design-system)

Shows tokens, type, controls (buttons, radios, year / date / time pickers, dialog), **navigation levels**, section rules, standing cards, horizontal scroll, covers, rank markers, **ballot** (chapter header, overlay search, category picks), skeletons, and empty/loading/error patterns as they are approved.

**Dev nav:** Site header includes a **Design system** link in local development and Vercel preview. Hidden on production (`VERCEL_ENV=production`). Other hosts can opt in with `SHOW_DESIGN_SYSTEM=1`.

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
| **Secondary** | In-page views | Underline tabs on a hairline under a **local** heading | Results: Reveal · Results · Full standings · Categories · Voters · Your ballot · Settings (hosts). Pre-publish: On the ballot / Ballot · Voters (open/closed) · Settings (hosts). Community Settings: Live Rankings · Events · Community |
| **Tertiary** | Board / filter | Plain text + middots, muted / active accent | Community · Hosts. Results boards: Ranked · Comparison |

Shared helpers: `navItemClass()` in [`src/components/ui/navLevels.ts`](../src/components/ui/navLevels.ts). Gallery: [`/design-system`](/design-system) → Navigation + Community header.

Rules:

- Community chrome uses `CommunityHeader`: eyebrow + name + primary chips on a `--panel` band — **no** meta between title and nav, **no** underline on the switcher
- Chips scroll horizontally on small screens (`overflow-x-auto`, no wrap, no arrow controls)
- Do **not** put secondary underlines in the community masthead (that clones Results)
- Results in-page views stay secondary underlines under the awards title (`{year} Video Game Awards`)
- Community Settings in-page views stay secondary underlines under **Settings**: Live Rankings · Events · Community
- Never stack identical primary chip rows
- Tertiary never uses boxes or underlines — text weight alone
- Panel fill is for the community masthead band and interactive blocks (ballots, dialogs) — not a card wrapped around Results
- Multi-year edition switching uses `EditionYearSelect` (pop-open) to the right of `{year} Video Game Awards` — not a second underline strip. Only when 2+ public years. Year links keep the current Results view and Community · Hosts board.
- Community Settings Events uses the same year select (shown even for a single year) plus **Open event**, which opens that year on the event page with Settings selected.

## Controls

`Button` — accent / bordered / quiet / **danger** / **danger-bordered**. Danger is only for irreversible destroy (delete event). Trigger uses `danger-bordered`; the confirm action uses filled `danger`. Do not use `--accent` orange for delete. `Radio` — native radio, restyled: empty `--line` ring, `--accent` fill when selected (brand orange, not the browser default). `RadioOption` — label + optional hint row for settings. Do not use unstyled platform radios in product UI.

`DatePicker` — button trigger (no text entry) with a branded calendar mark: `--accent` header bar, `--paper` rings, `--ink` day ticks. Opens a month grid in `--panel` with a hard `--line` border. Selected day uses `--accent`; today gets an accent ring; `min` / `max` disable out-of-range days. Hidden input when `name` is set. Do not use native `<input type="date">` in product UI.

`YearPicker` — same trigger language, calendar mark, year number on the button. Opens a 12-year grid with prev/next. Selected year uses `--accent`; the current year gets an accent ring. `min` / `max` default 1970–2100; `disabledYears` greys out taken years. Use for create-event year. Do not use a number input for calendar years.

`TimePicker` — button trigger (no text entry) with a branded clock mark. Opens hour / minute / AM·PM wheels (`TimePanel`). Value is `HH:mm`. Use when time is independent of date.

`DateTimePicker` — button trigger (no text entry) showing date and time, branded calendar mark. Click the field or icon to open a side-by-side panel: month grid + hour / minute / AM·PM. Hour and minute are infinite vertical wheels; the selected (or current) time sits at the top on open. AM/PM is top-aligned. Time pane is only as wide as the columns. Selected day and time use `--accent`. `min` / `max` as `YYYY-MM-DDTHH:mm`. Opens has no `min` — past dates are allowed. When empty, `anchorYear` opens the grid on that event year. Use for event schedule. Date-only fields (live scores) keep `DatePicker`.

`Dialog` — dimmed overlay (`bg-black/50`) + `--panel` surface with a display title. Escape and clicking the dimmed edge close it. Default: `--line` border, ink title (create event). `tone="danger"`: `--danger` border and title. Confirm with filled `danger`; cancel stays bordered. Event delete also requires typing the year. Do not invent a second modal chrome.

## Section rule

`SectionRule` — accent tick + hairline. Chapter breaks between Results blocks and between category awards. Prefer this over a plain `border-t` when the break should feel ceremonial.

## Standing cards + rank

`StandingGameCard` — cover + title (+ optional pts/year meta). Equal scores share a **displayed rank** from the event’s numbering setting (competition 1–1–3 or dense 1–1–2). Stored freeze `place` is board order only.

| Context | Rank treatment |
|---|---|
| GOTY podium | Large `RankMarker` **above** cover; cover **bottoms** share a baseline (all rank-1 games use winner size) |
| GOTY / category Reveal | Sticky scroll ceremony (default tab). GOTY #10→#1: number parks right on the Tied row; **tied ranks share one stage** — Tied lifts, then each cover in turn. Categories: `#1 · #2 · #3` columns in one board; each slides in from off-screen left (**#3→#2→#1**) and packs so earlier ranks push right; multi-row tied mosaics with titles. Short viewports raise the parked rank/Tied and scale covers so tiles stay below the chapter header. Not standings cards. `prefers-reduced-motion` skips scrubbing |
| GOTY Ranked | Wrapping grid (no horizontal scroll); **large** display place in front of the title. GOTY Top 10 even grid |
| GOTY / category Comparison strips | No place on the card (column headers name the source). Cover `MATRIX_COVER` below `lg`, `MATRIX_COVER_WIDE` (podium size) from `lg`. Titles start at **18px** (same as standings cards) and shrink toward 12px. Tie stacks follow the event’s competition or dense numbering |
| Category Ranked | One line per award; `HorizontalScroll` when displayed rank ≤ 3 overflows (full ties). Place in front of the title; #1 slightly wider than #2/#3 |
| Rest of Top 10 / Full standings / Categories | Accent place **in front of the title** (tight `gap-1`), meta aligned under the title — **never** a badge on the art |

Titles use `FitDisplayTitle` (2-line reserved + clamp; shrink toward 12px).

## Horizontal scroll

`HorizontalScroll` — intentional sideways strips (Rest of Top 10 on small screens, GOTY / category Comparison strips, category Ranked Top 3). Category Reveal slides its own #3→#2→#1 columns via scrub instead. Not used for GOTY Ranked (wrapping grid).

- Hide scrollbars; edge fade + quiet accent hairline when more content exists
- Desktop: drag-to-pan (click still works after a short move); optional prev/next via `showArrowControls` (off by default)
- Do **not** remap vertical wheel to horizontal
- Optional `stickyHeader` mirrors body scroll (one-way); no nested vertical scrollport
- Optional `HorizontalScrollGroup` keeps sibling strips on the same `scrollLeft` (GOTY Comparison rank rows)

## Bespoke identity components

Shipped: `GameCover`, `RankMarker`, `Button`, `Radio` / `RadioOption`, `YearPicker` / `DatePicker` / `TimePicker` / `DateTimePicker`, `Dialog`, skeleton family, `SectionRule`, `HorizontalScroll`, `FitDisplayTitle`, `navLevels`, `StandingGameCard` / `WinnerPodium`, `RankedStandingBillboard`, `BallotRankGrid`, `CommunityHeader` / `CommunityNav`, `CommunityEventsOverview`, `EditionSectionHeader`, `EditionRevealView`, `EditionGotyHighlights` / `EditionCategoriesHighlights`, `BallotChapterHeader`, `GameSearchField`, `CategoryPickCard` / `CategoryVoteHeading`, `CategoryVotesEditor`, `PinnedSaveBar`.

Planned: `EventNavigation`, `WinnerReveal`, `FinalStandings`, `ResultSourceSelector`, `GameVoteBreakdown`, `IndividualBallot`, `CategoryResult`, `VoterBreakdown`, `CommunityMemberRow`

## Ballot

Open voting uses the same primitives on events and personal GOTY lists.

| Piece | Role |
|---|---|
| `BallotChapterHeader` | Eyebrow + display title + optional deck / actions. GOTY: **Top 10** / Game of the Year. Categories: **Categories** / Award picks |
| `GameSearchField` | Search input; results **overlay** following content (border + `--panel`, no shadow). Open field raises `z-index` so the menu sits above sibling rows |
| GOTY ranking | Wrapping cover grid (`BallotRankGrid`); place in front of the title; drag to reorder while open; cap 10. Closed / Your ballot uses the same grid |
| `CategoryVoteHeading` | Display category name (`text-2xl`) + optional description |
| `CategoryPickCard` | Large cover (`w-28` / `sm:w-32`) + heading + picked title + optional **Clear** |
| `CategoryVotesEditor` | Added awards: empty heading + `GameSearchField`, or `CategoryPickCard`. Catalog: search + scrolling **Show all / group** secondary tabs, then a dense **square grid**. Show all is one board with a group tag in each tile. Eligibility copy only when it is not current year. |
| `PinnedSaveBar` | After an edit: `--panel` band pinned to the viewport bottom with Save. Hidden when clean |
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

## Fixtures that mocks must cover

Long game names, missing art, long usernames/community names, partial and full ballots, ties, zero-vote categories, many nominees, 15 voters and very large voter sets, one vs many Hosts, loading/empty/error/submitted/locked states.
