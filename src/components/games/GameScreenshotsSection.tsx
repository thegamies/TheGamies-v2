import { GameStillStrip } from "@/components/games/GameStillStrip";
import { SectionRule } from "@/components/ui/SectionRule";
import type { GameScreenshotStill } from "@/lib/catalog";

export function GameScreenshotsSection({
  screenshots,
}: {
  screenshots: GameScreenshotStill[];
}) {
  if (screenshots.length === 0) return null;
  return (
    <section>
      <SectionRule className="mb-6" />
      <h2 className="font-display text-3xl tracking-wide text-ink">
        Screenshots
      </h2>
      <div className="mt-4">
        <GameStillStrip label="Screenshots" items={screenshots} />
      </div>
    </section>
  );
}
