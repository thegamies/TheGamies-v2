# Design system — Editorial Standings (soft brutal)

## Direction

Dark neo-editorial design with sports-standings and awards-broadcast influence, tightened by **editorial minimalism** and **soft brutalism**.

Personality comes from composition, typography, game artwork, and rank treatment — not chrome.

Visual cues were mined from the local `goty` prototype (`references/visual-prototype`) — especially CSS tokens and border language. Do **not** import that project's product scope (export video, sync dashboard, etc.).

## Gallery

Internal catalog: [`/design-system`](/design-system)

Shows tokens, type, controls, **navigation levels**, section rules, standing cards, horizontal scroll, covers, rank markers, skeletons, and empty/loading/error patterns as they are approved.

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

Stacking identical bordered chips is forbidden — each level must read quieter than the one above.

| Level | Role | Look | Use |
|---|---|---|---|
| **Primary** | Section / page switcher | Bordered chips (`border-line` / active `border-accent`) | Community: Overview · Live · Edition · Settings |
| **Secondary** | In-page views | Underline tabs (`border-b-2`, active accent) | Results: Highlights · Full standings · Categories · Voters · Your ballot |
| **Tertiary** | Board / filter | Plain text + middots, muted / active accent | Community · Voices |

Shared helpers: `navItemClass()` in [`src/components/ui/navLevels.ts`](../src/components/ui/navLevels.ts). Gallery: [`/design-system`](/design-system) → Navigation.

Rules:

- Only **one** primary row per page chrome
- Secondary sits under the local heading (e.g. Results), not as a second chip strip cloning primary
- Tertiary never uses boxes or underlines — text weight alone
- Multi-year edition switching uses `EditionYearSelect` (pop-open) to the right of the Results / Game of the Year heading — not a second underline strip. Only when 2+ public years.

## Section rule

`SectionRule` — accent tick + hairline. Chapter breaks between Results blocks and between category awards. Prefer this over a plain `border-t` when the break should feel ceremonial.

## Standing cards + rank

`StandingGameCard` — cover + title (+ optional pts/year meta).

| Context | Rank treatment |
|---|---|
| GOTY podium | Large `RankMarker` **above** cover |
| Ballot matrix | Pinned `#` column only — **no** place on the card |
| Rest of Top 10 / Full standings / Categories | Accent place **in front of the title** (tight `gap-1`), meta aligned under the title — **never** a badge on the art |

Titles use `FitDisplayTitle` (3-line clamp, shrink toward 12px).

## Horizontal scroll

`HorizontalScroll` — intentional sideways strips (ballot matrix, Rest of Top 10 on small screens, category pick strips).

- Hide scrollbars; edge fade + quiet accent hairline when more content exists
- Desktop: drag-to-pan (click still works after a short move) + prev/next (~3 columns)
- Do **not** remap vertical wheel to horizontal
- Optional `stickyHeader` mirrors body scroll (one-way); no nested vertical scrollport

## Bespoke identity components

Shipped: `GameCover`, `RankMarker`, `Button`, skeleton family, `SectionRule`, `HorizontalScroll`, `FitDisplayTitle`, `navLevels`, `StandingGameCard` / `WinnerPodium`, `CommunityNav`, `BallotMatrix`.

Planned: `CommunityHeader`, `EventNavigation`, `RankedBallot`, `BallotGameRow`, `WinnerReveal`, `FinalStandings`, `ResultSourceSelector`, `GameVoteBreakdown`, `IndividualBallot`, `CategoryResult`, `VoterBreakdown`, `CommunityMemberRow`

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
| `--radius-control` | Buttons / inputs | `2px` |
| `--radius-artwork` | Covers | `0px` |
| `--cover-ratio` | Game art | `3 / 4` |
| `--page-max` | Content width | `72rem` |
| `--gutter` | Page padding | `1.5rem` |

Rules:

- Orange communicates selection, rank, or event status
- Artwork uses a consistent cover ratio
- Data sections prefer dividers and spacing over visible containers
- New colors, radii, shadows, and spacing require a deliberate system change

## Skeletons

Any client-loaded block with a known final shape must ship a matching skeleton. Prefer `Skeleton`, `SkeletonText`, `SkeletonCover`, `SkeletonBallotRow`, and `SkeletonStandingsRow` over spinners.

Skeletons use `--panel` / `--line`, hard edges, and a light pulse — not shimmer gradients that feel like SaaS dashboards.

## Responsive

- Minimum layout width we design for: **360px** (phone)
- Desktop (~1440): editorial width, pinned table identifiers when scrolling horizontally
- Tablet (~1024) / Mobile (~390): focused segmented views for Combined / Community / Voices / Ballots; no two-axis navigation for core comprehension
- Horizontal strips (ballot matrix, category picks): hide scrollbars; edge fade when more content; desktop drag-to-pan (click still works — drag starts after a short move) and prev/next. Touch/trackpad native scroll. Do not remap vertical wheel to horizontal. Ballot matrix column headers stick to the page (synced horizontal pan) — no nested vertical scrollport. Podium top-3 must fit 360 without sideways scroll.

## Fixtures that mocks must cover

Long game names, missing art, long usernames/community names, partial and full ballots, ties, zero-vote categories, many nominees, 15 voters and very large voter sets, one vs many Voices, loading/empty/error/submitted/locked states.
