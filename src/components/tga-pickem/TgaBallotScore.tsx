import { placeLabel } from "@/lib/tga-pickem/scoring";
import type { TgaViewerStanding } from "@/lib/tga-pickem/scores";

export function TgaBallotScore({
  standing,
}: {
  standing: TgaViewerStanding | null;
}) {
  if (!standing) {
    return (
      <p className="mt-8 text-sm text-muted">
        Score and rank appear as awards are called.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <p className="font-display text-5xl tracking-wide text-ink">
        {placeLabel(standing.place)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {standing.points} {standing.points === 1 ? "point" : "points"}
        {standing.wpDelta != null ? ` · ${standing.wpDelta} WP off` : ""}
        {standing.fieldSize > 1 ? ` · ${standing.fieldSize} players` : ""}
      </p>
    </div>
  );
}
