import Link from "next/link";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { navItemClass } from "@/components/ui/navLevels";
import { RankMarker } from "@/components/ui/RankMarker";
import { SectionRule } from "@/components/ui/SectionRule";
import {
  Skeleton,
  SkeletonBallotRow,
  SkeletonCover,
  SkeletonStandingsRow,
  SkeletonText,
} from "@/components/ui/Skeleton";

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
          <Button variant="accent" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Navigation">
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Primary bordered chips for page sections. Secondary underline tabs for
          in-page views. Tertiary plain text for board filters. Never stack
          identical chip rows. Helper:{" "}
          <code className="text-ink">navItemClass()</code>.
        </p>
        <div className="space-y-8">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Primary
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={navItemClass("primary", true)}>Edition</span>
              <span className={navItemClass("primary", false)}>Overview</span>
              <span className={navItemClass("primary", false)}>Live</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Secondary
            </p>
            <div className="mt-3 flex flex-wrap gap-5 border-b border-line">
              <span className={navItemClass("secondary", true)}>Highlights</span>
              <span className={navItemClass("secondary", false)}>
                Full standings
              </span>
              <span className={navItemClass("secondary", false)}>Categories</span>
              <span className={navItemClass("secondary", false)}>Voters</span>
              <span className={navItemClass("secondary", false)}>Your ballot</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Tertiary
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2">
              <span className={navItemClass("tertiary", true)}>Community</span>
              <span className="text-muted" aria-hidden>
                ·
              </span>
              <span className={navItemClass("tertiary", false)}>Voices</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Year select
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Pop-open beside Results / Game of the Year when 2+ public years
              exist — not a second underline strip.
            </p>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-6">
              <h3 className="font-display text-3xl tracking-wide text-ink">
                Results
              </h3>
              <EditionYearSelect
                slug="example"
                year={2026}
                years={[2026, 2025, 2024]}
              />
            </div>
          </div>
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
          rank on the art — optional place sits in front of the title.
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
          meta). Place before title when needed; omit for ballot matrix cells.
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
          edge fade + accent hairline, drag + prev/next. Never remap vertical
          wheel. Optional sticky header syncs sideways only.
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
