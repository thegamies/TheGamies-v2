# Design system — Editorial Standings (soft brutal)

## Direction

Dark neo-editorial design with sports-standings and awards-broadcast influence, tightened by **editorial minimalism** and **soft brutalism**.

Personality comes from composition, typography, game artwork, and rank treatment — not chrome.

Visual cues were mined from the local `goty` prototype (`references/visual-prototype`) — especially CSS tokens and border language. Do **not** import that project's product scope (export video, sync dashboard, etc.).

## Gallery

Internal catalog: [`/design-system`](/design-system)

Shows tokens, type, controls, covers, rank markers, skeletons, and empty/loading/error patterns as they are approved.

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

## Bespoke identity components

Shipped stubs: `GameCover`, `RankMarker`, `Button`, skeleton family.

Planned: `CommunityHeader`, `EventNavigation`, `RankedBallot`, `BallotGameRow`, `WinnerReveal`, `WinnerPodium`, `FinalStandings`, `ResultSourceSelector`, `GameVoteBreakdown`, `BallotMatrix`, `IndividualBallot`, `CategoryResult`, `VoterBreakdown`, `CommunityMemberRow`

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

- Desktop (~1440): editorial width, pinned table identifiers when scrolling horizontally
- Tablet (~1024) / Mobile (~390): focused segmented views for Combined / Community / Voices / Ballots; no two-axis navigation for core comprehension

## Fixtures that mocks must cover

Long game names, missing art, long usernames/community names, partial and full ballots, ties, zero-vote categories, many nominees, 15 voters and very large voter sets, one vs many Voices, loading/empty/error/submitted/locked states.
