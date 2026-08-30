import Link from "next/link";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { TgaBallotForm } from "@/components/tga-pickem/TgaBallotForm";
import type { TgaBallotCategory } from "@/lib/tga-pickem/service";

export function TgaPublicSheet({
  displayName,
  username,
  avatarUrl,
  standingsHref,
  categories,
  picks,
  guess,
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
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
      <div className="mt-6">
        <PersonIdentity
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
          size={56}
          href={`/u/${username}`}
          nameClassName="font-display text-3xl tracking-wide text-ink"
        />
      </div>
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
