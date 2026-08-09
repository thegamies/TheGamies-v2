# Design system — Editorial Standings (soft brutal)

## Direction

Dark neo-editorial design with sports-standings and awards-broadcast influence, tightened by **editorial minimalism** and **soft brutalism**.

Personality comes from composition, typography, game artwork, and rank treatment — not chrome.

## Characteristics

- Near-black background
- Warm off-white primary text
- Restrained orange accent (`#ff5a1f` reference)
- Oversized display typography
- Serif supporting/deck copy used sparingly
- Hard dividers and visible structural borders
- Square or lightly rounded utility controls (not pill-everything)
- Dense, readable tables
- Large artwork-led moments
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

## Component library policy

Use Radix, React Aria, or Headless UI for behavior and accessibility only. Restyle with tokens so the kit is not identifiable by sight.

## Bespoke identity components

`CommunityHeader`, `EventNavigation`, `RankedBallot`, `BallotGameRow`, `GameCover`, `RankMarker`, `WinnerReveal`, `WinnerPodium`, `FinalStandings`, `ResultSourceSelector`, `GameVoteBreakdown`, `BallotMatrix`, `IndividualBallot`, `CategoryResult`, `VoterBreakdown`, `CommunityMemberRow`

## Tokens

Define and reuse tokens; no arbitrary one-off values.

Minimum categories: page background, raised surface, primary/secondary text, subtle/strong borders, accent, page max width, gutters, type scale, control radius, artwork radius, spacing, motion.

Rules:

- Orange communicates selection, rank, or event status
- Artwork uses a consistent cover ratio
- Data sections prefer dividers and spacing over visible containers
- New colors, radii, shadows, and spacing require a deliberate system change

## Responsive

- Desktop (~1440): editorial width, pinned table identifiers when scrolling horizontally
- Tablet (~1024) / Mobile (~390): focused segmented views for Combined / Community / Voices / Ballots; no two-axis navigation for core comprehension

## Fixtures that mocks must cover

Long game names, missing art, long usernames/community names, partial and full ballots, ties, zero-vote categories, many nominees, 15 voters and very large voter sets, one vs many Voices, loading/empty/error/submitted/locked states.
