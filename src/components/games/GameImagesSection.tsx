"use client";

import { useState } from "react";
import { GameStillStrip } from "@/components/games/GameStillStrip";
import { SectionRule } from "@/components/ui/SectionRule";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { navItemClass } from "@/components/ui/navLevels";
import { imageChaptersFromMedia } from "@/lib/catalog-game-media";
import type { GameArtworkStill } from "@/lib/catalog";

export function GameImagesSection({
  artworks,
}: {
  artworks: GameArtworkStill[];
}) {
  const chapters = imageChaptersFromMedia(artworks);
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "");
  const active = chapters.find((chapter) => chapter.id === activeId) ?? chapters[0];
  if (!active) return null;

  return (
    <section>
      <SectionRule className="mb-6" />
      <h2 className="font-display text-3xl tracking-wide text-ink">Images</h2>
      {chapters.length > 1 ? (
        <ScrollableNav aria-label="Image type" className="mt-4">
          {chapters.map((chapter) => {
            const selected = chapter.id === active.id;
            return (
              <button
                key={chapter.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveId(chapter.id)}
                className={navItemClass("secondary", selected)}
              >
                {chapter.label}
              </button>
            );
          })}
        </ScrollableNav>
      ) : null}
      <div className="mt-4">
        <GameStillStrip label={active.label} items={active.items} />
      </div>
    </section>
  );
}
