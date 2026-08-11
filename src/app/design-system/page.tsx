import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
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
        rank, selection, and status only. Client-loaded blocks use matching
        skeletons — never a lone spinner that collapses layout.
      </p>
      <p className="mt-3">
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
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
            <GameCover
              title="Fixture cover"
              imageUrl="https://images.igdb.com/igdb/image/upload/t_cover_big/co9wvg.jpg"
            />
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
