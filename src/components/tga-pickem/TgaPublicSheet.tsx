import Link from "next/link";
import { TgaBallotForm } from "@/components/tga-pickem/TgaBallotForm";
import type { TgaBallotCategory } from "@/lib/tga-pickem/service";

export function TgaPublicSheet({
  displayName,
  standingsHref,
  categories,
  picks,
  guess,
}: {
  displayName: string;
  standingsHref: string;
  categories: TgaBallotCategory[];
  picks: Record<string, string>;
  guess: number | null;
}) {
  return (
    <section className="mt-2">
      <p className="text-sm">
        <Link href={standingsHref} className="font-semibold text-accent">
          Back to standings
        </Link>
      </p>
      <h2 className="mt-6 font-display text-3xl tracking-wide text-ink">
        {displayName}
      </h2>
      {Object.keys(picks).length === 0 && guess == null ? (
        <p className="mt-4 text-muted">No entry on this board.</p>
      ) : (
        <TgaBallotForm
          categories={categories}
          initialPicks={picks}
          initialGuess={guess}
          locked
        />
      )}
    </section>
  );
}
