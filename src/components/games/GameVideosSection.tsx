"use client";

import { useState } from "react";
import Image from "next/image";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import type { GameVideoClip } from "@/lib/catalog";

export function GameVideosSection({ videos }: { videos: GameVideoClip[] }) {
  const [activeId, setActiveId] = useState(videos[0]?.igdbId ?? null);
  const active = videos.find((v) => v.igdbId === activeId) ?? videos[0];
  if (!active) return null;

  return (
    <section>
      <SectionRule className="mb-6" />
      <h2 className="font-display text-3xl tracking-wide text-ink">Videos</h2>
      <div className="relative mt-4 aspect-video w-full overflow-hidden border border-line bg-panel">
        <iframe
          key={active.videoId}
          title={active.name}
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(active.videoId)}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {videos.length > 1 ? (
        <HorizontalScroll className="mt-3" label="Videos">
          <ul className="flex w-max gap-3 px-1 py-2">
            {videos.map((video) => {
              const selected = video.igdbId === active.igdbId;
              return (
                <li key={video.igdbId} className="w-[200px] shrink-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveId(video.igdbId)}
                    className={`w-full text-left transition-colors ${
                      selected ? "text-accent" : "text-ink hover:text-accent"
                    }`}
                  >
                    <span className="relative mb-2 block aspect-video overflow-hidden border border-line bg-panel">
                      {video.posterUrl ? (
                        <Image
                          src={video.posterUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      ) : null}
                    </span>
                    <span className="text-sm tracking-wide">{video.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </HorizontalScroll>
      ) : null}
    </section>
  );
}
