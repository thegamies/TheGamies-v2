import Link from "next/link";
import {
  CategoryVotesEditorFixture,
  GameSearchFieldFixture,
} from "@/app/design-system/BallotFixtures";
import { DatePickerFixture } from "@/app/design-system/DatePickerFixture";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { EditionSectionHeader } from "@/components/communities/EditionSectionHeader";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { Button } from "@/components/ui/Button";
import { Radio, RadioOption } from "@/components/ui/Radio";
import { CategoryPickCard } from "@/components/ui/CategoryPickCard";
import { GameCover } from "@/components/ui/GameCover";
import { YearSelect } from "@/components/ui/YearSelect";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { navItemClass } from "@/components/ui/navLevels";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import { RankMarker } from "@/components/ui/RankMarker";
import { SectionRule } from "@/components/ui/SectionRule";
import {
  Skeleton,
  SkeletonBallotRow,
  SkeletonCover,
  SkeletonStandingsRow,
  SkeletonText,
} from "@/components/ui/Skeleton";
import type { EditionStatus } from "@/lib/communities/edition-status";

export const metadata = {
  title: "Design system",
};

const FIXTURE_COVER =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/co9wvg.jpg";

const swatches = [
  { name: "paper", className: "bg-paper", value: "#0d0d0e" },
  { name: "panel", className: "bg-panel", value: "#151516" },
  { name: "ink", className: "bg-ink", value: "#f4f0e8" },
  { name: "muted", className: "bg-muted", value: "#aaa69e" },
  { name: "line", className: "bg-line", value: "#2b2a28" },
  { name: "accent", className: "bg-accent", value: "#ff5a1f" },
  { name: "danger", className: "bg-danger", value: "#c7372a" },
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="font-display text-3xl tracking-wide text-ink">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const RESULTS_VIEWS = [
  "Reveal",
  "Results",
  "Full standings",
  "Categories",
  "Voters",
  "Your ballot",
] as const;

const EDITION_COPY_STATES: EditionStatus[] = [
  "scheduled",
  "open",
  "closed",
  "published",
];

/** Fixture: Results block under the community masthead. */
function MastheadResultsFixture() {
  return (
    <div className="mt-10">
      <EditionSectionHeader
        status="published"
        slug="example"
        year={2026}
        years={[2026, 2025]}
      />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line">
        <div className="flex flex-wrap gap-5">
          {RESULTS_VIEWS.map((label, i) => (
            <span
              key={label}
              className={navItemClass("secondary", i === 0)}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 pb-1.5">
          <span className={navItemClass("tertiary", true)}>Community</span>
          <span className="text-muted" aria-hidden>
            ·
          </span>
          <span className={navItemClass("tertiary", false)}>Hosts</span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-2">
        <span className={navItemClass("tertiary", true)}>Ranked</span>
        <span className="text-muted" aria-hidden>
          ·
        </span>
        <span className={navItemClass("tertiary", false)}>Comparison</span>
      </div>
      <p className="mt-6 text-sm text-muted">Standings content starts here…</p>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-12">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-accent uppercase">
        Internal catalog
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-wide text-ink sm:text-6xl">
        Design system
      </h1>
      <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed text-muted">
        Editorial Standings with soft brutalism. Borders over shadows. Accent for
        rank, selection, and status only. New UI patterns ship here and in{" "}
        <code className="text-sm text-ink">docs/design-system.md</code> — no
        one-offs.
      </p>
      <p className="mt-3">
        <Link
          href="/"
          className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Home
        </Link>
      </p>

      <Section title="Color">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {swatches.map((s) => (
            <div key={s.name} className="border border-line">
              <div className={`h-16 ${s.className}`} />
              <div className="border-t border-line bg-panel p-2">
                <p className="text-xs font-semibold text-ink">{s.name}</p>
                <p className="text-[11px] text-muted">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-4 border border-line bg-panel p-5">
          <p className="font-display text-5xl tracking-wide text-ink">
            Display · Bebas Neue
          </p>
          <p className="text-lg text-ink">Body · Archivo — primary reading text.</p>
          <p className="font-serif text-lg text-muted">
            Deck · Source Serif 4 — supporting copy used sparingly.
          </p>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
            Eyebrow / meta label
          </p>
        </div>
      </Section>

      <Section title="Controls">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent">Accent</Button>
          <Button variant="bordered">Bordered</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-bordered">Danger bordered</Button>
          <Button variant="accent" disabled>
            Disabled
          </Button>
        </div>
        <p className="mt-8 mb-4 max-w-2xl text-sm text-muted">
          Radios: empty `--line` ring, `--accent` fill when selected. Native
          input for forms. Helper: <code className="text-ink">Radio</code> /{" "}
          <code className="text-ink">RadioOption</code>.
        </p>
        <fieldset className="max-w-xl space-y-3">
          <legend className="mb-3 text-sm font-medium tracking-wide text-muted">
            Tie numbering
          </legend>
          <RadioOption
            name="design-system-rank"
            value="competition"
            defaultChecked
            hint="Tied games share a place. The next place skips (1 · 1 · 3)."
          >
            Competition
          </RadioOption>
          <RadioOption
            name="design-system-rank"
            value="dense"
            hint="Tied games share a place. The next place is the next number (1 · 1 · 2)."
          >
            Dense
          </RadioOption>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <Radio name="design-system-rank-plain" value="on" defaultChecked />
              Selected
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <Radio name="design-system-rank-plain" value="off" />
              Unselected
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <Radio name="design-system-rank-disabled" value="x" disabled />
              Disabled
            </label>
          </div>
        </fieldset>
        <p className="mt-10 mb-4 max-w-2xl text-sm text-muted">
          Year, date, time, and combined date-time pickers: no typing. Click
          the field to open a year grid, month grid, or scrolling time.
          Helpers: <code className="text-ink">YearPicker</code>,{" "}
          <code className="text-ink">DatePicker</code>,{" "}
          <code className="text-ink">TimePicker</code>,{" "}
          <code className="text-ink">DateTimePicker</code>.{" "}
          <code className="text-ink">Dialog</code> for create;{" "}
          <code className="text-ink">{`tone="danger"`}</code> for delete.
        </p>
        <DatePickerFixture />
      </Section>

      <Section title="Navigation">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Primary chips for community masthead. Secondary underlines only under
          a local heading (Results, Community Settings). Tertiary for board
          filters. Helper:{" "}
          <code className="text-ink">navItemClass()</code>.
        </p>
        <div className="space-y-8">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Primary · bordered chips
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={navItemClass("primary", true)}>Events</span>
              <span className={navItemClass("primary", false)}>Overview</span>
              <span className={navItemClass("primary", false)}>
                Live Rankings
              </span>
              <span className={navItemClass("primary", false)}>Members</span>
              <span className={navItemClass("primary", false)}>Settings</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Secondary · underline on hairline
            </p>
            <div className="mt-3 flex flex-wrap gap-5 border-b border-line">
              <span className={navItemClass("secondary", true)}>Reveal</span>
              <span className={navItemClass("secondary", false)}>Results</span>
              <span className={navItemClass("secondary", false)}>
                Full standings
              </span>
              <span className={navItemClass("secondary", false)}>Categories</span>
              <span className={navItemClass("secondary", false)}>Voters</span>
              <span className={navItemClass("secondary", false)}>Your ballot</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-5 border-b border-line">
              <span className={navItemClass("secondary", true)}>
                Live Rankings
              </span>
              <span className={navItemClass("secondary", false)}>Events</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Tertiary · plain text
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2">
              <span className={navItemClass("tertiary", true)}>Community</span>
              <span className="text-muted" aria-hidden>
                ·
              </span>
              <span className={navItemClass("tertiary", false)}>Hosts</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Year select
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Pop-open beside the section title — editions when 2+ public years;
              live standings always show the control. Not a second underline
              strip.
            </p>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-6">
              <h3 className="font-display text-3xl tracking-wide text-ink">
                2026 Video Game Awards
              </h3>
              <EditionYearSelect
                slug="example"
                year={2026}
                years={[2026, 2025, 2024]}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-6">
              <h3 className="font-display text-3xl tracking-wide text-ink">
                2026 Game of the Year
              </h3>
              <YearSelect
                year={2026}
                options={[
                  { year: 2026, href: "/game-of-the-year/2026" },
                  { year: 2025, href: "/game-of-the-year/2025" },
                  { year: 2024, href: "/game-of-the-year/2024" },
                ]}
                alwaysShow
                label="Standings year"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Community header">
        <p className="mb-6 max-w-2xl text-sm text-muted">
          Canonical masthead:{" "}
          <code className="text-ink">CommunityHeader</code> —{" "}
          <code className="text-ink">--panel</code> band, name, primary chips.
          No meta between title and nav; no underline on the switcher. Results
          secondary stays under the local heading on paper.
        </p>
        <div className="overflow-hidden border border-line">
          <div className="px-[var(--gutter)] py-6">
            <CommunityHeader
              name="Test"
              slug="example"
              liveEnabled
              canManage
              editionStatus="published"
              active="edition"
            />
            <MastheadResultsFixture />
          </div>
        </div>
      </Section>

      <Section title="Edition section header">
        <p className="mb-6 max-w-2xl text-sm text-muted">
          Same awards title as overview (2026 Video Game Awards). Serif deck
          for schedule. Year select only when there are two or more public
          years — no duplicate year beside a single-year title.
        </p>
        <div className="space-y-8">
          {EDITION_COPY_STATES.map((status) => (
            <div key={status} className="border border-line p-5">
              <EditionSectionHeader
                status={status}
                slug="example"
                year={2026}
                years={status === "published" ? [2026, 2025] : [2026]}
                opensAt={new Date("2026-11-01T18:00:00.000Z")}
                closesAt={new Date("2026-12-15T18:00:00.000Z")}
                publishesAt={new Date("2026-12-20T18:00:00.000Z")}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Section rule">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Accent-tick chapter break between major blocks (
          <code className="text-ink">SectionRule</code>). Used between Results
          sections and category awards.
        </p>
        <SectionRule />
        <p className="mt-6 font-display text-3xl tracking-wide text-ink">
          Next chapter
        </p>
      </Section>

      <Section title="Surfaces">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-line bg-paper p-5">
            <p className="text-sm text-muted">Paper surface</p>
            <p className="mt-2 text-ink">Hard divider language, no nested cards.</p>
          </div>
          <div className="border border-line bg-panel p-5">
            <p className="text-sm text-muted">Panel surface</p>
            <p className="mt-2 text-ink">Raised only by fill + border, not shadow.</p>
          </div>
        </div>
      </Section>

      <Section title="Rank + cover">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Podium / matrix use large or column ranks. Standing cards never put
          rank on the art — when scores show, place sits above the cover with
          the score on the right; otherwise place sits in front of the title.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex items-end gap-3">
            <RankMarker rank={1} size="lg" />
            <RankMarker rank={2} size="md" />
            <RankMarker rank={10} size="sm" />
          </div>
          <div className="w-28">
            <GameCover title="Missing art example" />
          </div>
          <div className="w-28">
            <GameCover title="Fixture cover" imageUrl={FIXTURE_COVER} />
          </div>
        </div>
      </Section>

      <Section title="Standing cards">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          <code className="text-ink">StandingGameCard</code> — cover + title (+
          meta). When scores show, rank above cover with score on the right;
          otherwise place before title. Omit place for Comparison strip cells.
        </p>
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          <li>
            <StandingGameCard
              place={4}
              slug="fixture"
              title="Super Battle Golf"
              coverUrl={FIXTURE_COVER}
              year={2026}
              points={51}
            />
          </li>
          <li>
            <StandingGameCard
              place={10}
              slug="fixture-long"
              title="Doom: The Dark Ages - Revelations"
              coverUrl={FIXTURE_COVER}
              year={2026}
              points={12}
            />
          </li>
          <li>
            <StandingGameCard
              slug="fixture-matrix"
              title="Matrix cell (no place)"
              coverUrl={FIXTURE_COVER}
              size="sm"
            />
          </li>
        </ul>
      </Section>

      <Section title="Horizontal scroll">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          <code className="text-ink">HorizontalScroll</code> — hide scrollbars,
          edge fade + accent hairline, drag-to-pan. Arrow controls off by
          default (<code className="text-ink">showArrowControls</code>). Never
          remap vertical wheel. Optional sticky header syncs sideways only.
        </p>
        <HorizontalScroll label="fixture strip">
          <ul className="flex w-max gap-4 px-1 py-2">
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <li key={n} className="w-[132px] shrink-0">
                <StandingGameCard
                  place={n}
                  slug={`fixture-${n}`}
                  title={`Fixture game ${n}`}
                  coverUrl={FIXTURE_COVER}
                  year={2026}
                  points={60 - n}
                />
              </li>
            ))}
          </ul>
        </HorizontalScroll>
      </Section>

      <Section title="Ballot">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Voting uses chapter headers, overlay search, a GOTY cover grid, and
          category pick cards. After an edit,{" "}
          <code className="text-ink">PinnedSaveBar</code> sticks Save to the
          bottom. Leaving with unsaved edits uses{" "}
          <code className="text-ink">useUnsavedChangesGuard</code>. Helpers:{" "}
          <code className="text-ink">BallotChapterHeader</code>,{" "}
          <code className="text-ink">GameSearchField</code>,{" "}
          <code className="text-ink">CategoryPickCard</code>,{" "}
          <code className="text-ink">PinnedSaveBar</code>.
        </p>
        <div className="space-y-10">
          <div>
            <p className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Chapter header
            </p>
            <BallotChapterHeader
              eyebrow="Top 10"
              title="Game of the Year"
              description="Rank up to 10 games from 2026. Drag to reorder."
            />
          </div>
          <div>
            <p className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Overlay search
            </p>
            <p className="mb-3 max-w-xl text-sm text-muted">
              Type two or more letters. The menu sits on top of whatever
              follows.
            </p>
            <GameSearchFieldFixture />
            <p className="mt-6 text-sm text-muted">
              Content under the field stays put — this line does not jump.
            </p>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Category pick
            </p>
            <CategoryPickCard
              label="Best Narrative"
              description="Story, writing, and world."
              title="Super Battle Golf"
              coverUrl={FIXTURE_COVER}
            />
          </div>
          <div>
            <p className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Award picks editor
            </p>
            <CategoryVotesEditorFixture />
          </div>
          <div>
            <p className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Pinned save
            </p>
            <p className="mb-3 max-w-xl text-sm text-muted">
              Appears after an edit. Panel band + hairline — not a floating
              card.
            </p>
            <div className="relative h-36 overflow-hidden border border-line">
              <p className="p-4 text-sm text-muted">Ballot content…</p>
              <PinnedSaveBar className="absolute inset-x-0 bottom-0">
                <Button type="button">Save ballot</Button>
              </PinnedSaveBar>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Skeletons">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm text-muted">Primitives</p>
            <div className="flex items-start gap-4">
              <SkeletonCover className="w-20" />
              <SkeletonText lines={3} className="flex-1" />
            </div>
            <Skeleton className="mt-4 h-10 w-40" />
          </div>
          <div>
            <p className="mb-3 text-sm text-muted">Ballot rows</p>
            <SkeletonBallotRow />
            <SkeletonBallotRow />
            <SkeletonBallotRow />
          </div>
          <div className="lg:col-span-2">
            <p className="mb-3 text-sm text-muted">Standings rows</p>
            <SkeletonStandingsRow />
            <SkeletonStandingsRow />
            <SkeletonStandingsRow />
          </div>
        </div>
      </Section>

      <Section title="States">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-dashed border-line p-5">
            <p className="text-sm font-semibold text-ink">Empty</p>
            <p className="mt-2 text-sm text-muted">
              No ballots yet. When voting opens, this surface fills with ranks.
            </p>
          </div>
          <div className="border border-line bg-panel p-5">
            <p className="text-sm font-semibold text-ink">Loading</p>
            <p className="mt-2 text-sm text-muted">
              Prefer skeletons that match final geometry over spinners.
            </p>
            <SkeletonText lines={2} className="mt-4" />
          </div>
          <div className="border border-line p-5">
            <p className="text-sm font-semibold text-accent">Error</p>
            <p className="mt-2 text-sm text-muted">
              Couldn’t load results. Keep the page chrome; replace the data block.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
