"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { FitDisplayTitle } from "@/components/ui/FitDisplayTitle";

type TieGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

const ROTATE_MS = 2800;
/** After a manual cycle, wait this long before auto-rotate resumes. */
const RESUME_AFTER_TAP_MS = 4500;
const CROSSFADE_MS = 400;
const MAX_PEEK = 3;
const PEEK_PX = 7;

function StackCover({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-artwork)] border border-line bg-panel">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          draggable={false}
          className="pointer-events-none object-cover"
          sizes="(max-width: 1023px) 103px, 206px"
          suppressHydrationWarning
        />
      ) : (
        <div className="flex h-full w-full items-end p-2">
          <p className="font-display text-sm leading-none tracking-wide text-muted">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}

function CoverStack({
  games,
  startIndex,
  count,
}: {
  games: TieGame[];
  startIndex: number;
  count: number;
}) {
  const peek = Math.min(MAX_PEEK, count);
  const peekPad = (peek - 1) * PEEK_PX;

  return (
    <>
      {Array.from({ length: peek }, (_, depth) => {
        const game = games[(startIndex + depth) % count]!;
        const offset = depth * PEEK_PX;
        const style: CSSProperties = {
          width: `calc(100% - ${peekPad}px)`,
          height: `calc(100% - ${peekPad}px)`,
          transform: `translate(${offset}px, ${offset}px)`,
          zIndex: peek - depth,
          opacity: depth === 0 ? 1 : Math.max(0.5, 0.88 - depth * 0.14),
        };
        return (
          <span
            key={depth}
            className="absolute top-0 left-0"
            style={style}
            aria-hidden={depth !== 0}
          >
            <StackCover title={game.title} imageUrl={game.coverUrl} />
          </span>
        );
      })}
    </>
  );
}

const emptySubscribe = () => () => {};

function useClientMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type Layer = {
  index: number;
  opacity: number;
};

/**
 * Tied Community / Voices in one strip-card footprint.
 * Two persistent layers crossfade so the visible stack never remounts mid-fade.
 * Optional `className` / title fit for denser boards (e.g. Reveal summary).
 */
export function CompactTieStack({
  games,
  className = "w-[103px] lg:w-[206px]",
  titleMaxPx = 14,
  titleMinPx = 12,
}: {
  games: TieGame[];
  className?: string;
  titleMaxPx?: number;
  titleMinPx?: number;
}) {
  const count = games.length;
  const [front, setFront] = useState(0);
  const [layerA, setLayerA] = useState<Layer>({ index: 0, opacity: 1 });
  const [layerB, setLayerB] = useState<Layer>({ index: 0, opacity: 0 });
  /** Which layer sits on top during / after the last crossfade. */
  const [top, setTop] = useState<"a" | "b">("a");
  /** Avoid dual-layer SSR markup differing from the first client paint. */
  const mounted = useClientMounted();
  const resumeAtRef = useRef(0);
  const skipRef = useRef(true);
  const busyRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const topRef = useRef<"a" | "b">("a");

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      if (Date.now() < resumeAtRef.current) return;
      setFront((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (count < 2) return;

    const run = (next: number) => {
      if (busyRef.current) {
        pendingRef.current = next;
        return;
      }
      busyRef.current = true;

      const fadeToB = topRef.current === "a";
      if (fadeToB) {
        setLayerB({ index: next, opacity: 0 });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLayerB({ index: next, opacity: 1 });
            setLayerA((a) => ({ ...a, opacity: 0 }));
            topRef.current = "b";
            setTop("b");
          });
        });
      } else {
        setLayerA({ index: next, opacity: 0 });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLayerA({ index: next, opacity: 1 });
            setLayerB((b) => ({ ...b, opacity: 0 }));
            topRef.current = "a";
            setTop("a");
          });
        });
      }

      window.setTimeout(() => {
        busyRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending != null && pending !== next) {
          run(pending);
        }
      }, CROSSFADE_MS + 20);
    };

    run(front % count);
  }, [front, count]);

  if (count === 0) return null;

  const visibleIndex = layerA.opacity >= layerB.opacity ? layerA.index : layerB.index;
  const active = games[visibleIndex % count]!;
  const titleA = games[layerA.index % count]!;
  const titleB = games[layerB.index % count]!;

  function cycle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFront((i) => (i + 1) % count);
    resumeAtRef.current = Date.now() + RESUME_AFTER_TAP_MS;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={cycle}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-artwork)] text-left"
        aria-label={`Tied games, showing ${active.title}. Activate to show next.`}
      >
        <span
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: layerA.opacity,
            transitionDuration: `${CROSSFADE_MS}ms`,
            zIndex: top === "a" ? 2 : 1,
          }}
        >
          <CoverStack games={games} startIndex={layerA.index} count={count} />
        </span>
        {mounted ? (
          <span
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: layerB.opacity,
              transitionDuration: `${CROSSFADE_MS}ms`,
              zIndex: top === "b" ? 2 : 1,
            }}
          >
            <CoverStack games={games} startIndex={layerB.index} count={count} />
          </span>
        ) : null}

        <span className="pointer-events-none absolute top-1.5 left-1.5 z-30 rounded-[2px] border border-line/80 bg-paper/80 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase shadow-sm">
          Tied · {count}
        </span>

        {count > 1 ? (
          <span
            className="pointer-events-none absolute inset-x-2 bottom-1.5 z-30 flex justify-center"
            aria-hidden
          >
            <span className="rounded-full border border-line/60 bg-paper/70 px-2.5 py-1 text-[10px] font-semibold tabular-nums leading-none tracking-wide text-ink shadow-sm">
              {(front % count) + 1} / {count}
            </span>
          </span>
        ) : null}
      </button>

      <div className="relative mt-2 min-w-0">
        <div className="invisible" aria-hidden>
          <FitDisplayTitle
            className="w-full"
            maxPx={titleMaxPx}
            minPx={titleMinPx}
            lines={2}
          >
            {active.title}
          </FitDisplayTitle>
        </div>
        <div
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: layerA.opacity,
            transitionDuration: `${CROSSFADE_MS}ms`,
          }}
        >
          <Link
            href={`/games/${titleA.slug}`}
            className="group/title block min-w-0"
          >
            <FitDisplayTitle
              className="w-full group-hover/title:text-accent"
              maxPx={titleMaxPx}
              minPx={titleMinPx}
              lines={2}
            >
              {titleA.title}
            </FitDisplayTitle>
          </Link>
        </div>
        {mounted ? (
          <div
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: layerB.opacity,
              transitionDuration: `${CROSSFADE_MS}ms`,
            }}
          >
            <Link
              href={`/games/${titleB.slug}`}
              className="group/title block min-w-0"
            >
              <FitDisplayTitle
                className="w-full group-hover/title:text-accent"
                maxPx={titleMaxPx}
                minPx={titleMinPx}
                lines={2}
              >
                {titleB.title}
              </FitDisplayTitle>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
