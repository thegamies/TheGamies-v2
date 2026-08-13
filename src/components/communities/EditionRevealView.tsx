"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import { groupByRank } from "@/lib/standings/shared-rank";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

const ReducedMotionCtx = createContext(false);

function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return (
    <ReducedMotionCtx.Provider value={reduced}>
      {children}
    </ReducedMotionCtx.Provider>
  );
}

function useReducedMotion() {
  return useContext(ReducedMotionCtx);
}

type PaintFn = (progress: number, frame: HTMLElement) => void;

/**
 * One sticky viewport for the whole chapter (title + stage).
 * Nested sticky (title then stage) breaks scrubbing on iOS Safari.
 * Stage uses grid + absolute fill — flex-1 children often collapse to 0
 * height on iPhone, which hid every place/award layer.
 */
function CeremonyChapter({
  eyebrow,
  title,
  heightVh,
  paint,
  children,
}: {
  eyebrow: string;
  title: string;
  heightVh: number;
  paint: PaintFn;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const reduced = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    const stage = stageRef.current;
    const titleEl = titleRef.current;
    const head = headRef.current;
    if (!track || !frame || !stage || !titleEl || !head) return;

    let raf = 0;
    let lastShrink = -1;

    const apply = () => {
      raf = 0;
      if (reduced) {
        titleEl.style.fontSize = "1.5rem";
        head.style.paddingTop = "0.6rem";
        head.style.paddingBottom = "0.6rem";
        paintRef.current(1, stage);
        return;
      }

      const frameH = Math.max(1, frame.offsetHeight || window.innerHeight);
      const total = Math.max(1, track.offsetHeight - frameH);
      const scrolled = -track.getBoundingClientRect().top;
      const p = clamp(scrolled / total, 0, 1);
      paintRef.current(p, stage);

      const shrink = easeInOut(clamp(p / 0.08, 0, 1));
      if (Math.abs(shrink - lastShrink) >= 0.003) {
        lastShrink = shrink;
        titleEl.style.fontSize = `clamp(${2.1 - shrink * 0.7}rem, ${7.5 - shrink * 5.2}vw, ${4.5 - shrink * 3}rem)`;
        head.style.paddingTop = `${0.5 + (1 - shrink) * 0.45}rem`;
        head.style.paddingBottom = `${0.45 + (1 - shrink) * 0.3}rem`;
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", onScroll);
    window.visualViewport?.addEventListener("scroll", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${heightVh}vh` }}>
      <div
        ref={frameRef}
        className="sticky top-0 h-[100svh] overflow-hidden bg-paper"
      >
        {/* Full-bleed stage first so it always owns the viewport box on iOS. */}
        <div ref={stageRef} className="absolute inset-0">
          {children}
        </div>

        <div
          ref={headRef}
          className="absolute inset-x-0 top-0 z-20 border-b border-line bg-paper/95 px-[var(--gutter)] backdrop-blur-[2px]"
          style={{ paddingTop: "1.1rem", paddingBottom: "0.85rem" }}
        >
          <div className="relative mx-auto w-full max-w-[var(--page-max)]">
            <div
              aria-hidden
              className="absolute -left-[var(--gutter)] top-0 bottom-0 w-1 bg-accent"
            />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </p>
            <h2
              ref={titleRef}
              className="mt-1 font-display leading-[0.9] tracking-wide text-ink"
              style={{ fontSize: "clamp(2.25rem, 8vw, 4.5rem)" }}
            >
              {title}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

function CeremonyArt({
  title,
  coverUrl,
  priority,
}: {
  title: string;
  coverUrl: string | null;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden border border-line bg-panel">
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          fill
          priority={priority}
          draggable={false}
          className="object-cover"
          sizes="(max-width: 768px) 45vw, 300px"
        />
      ) : (
        <div className="flex h-full items-end p-3">
          <p className="font-display text-xl leading-none tracking-wide text-muted">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Map global progress → per-item local t in roughly [-0.2, 1.2]
 * so neighbors overlap: one exits right while the next enters left.
 */
function localT(p: number, index: number, count: number) {
  if (count <= 1) return Math.max(p, 0.4);
  // Each item owns 1 unit; overlap windows by ~0.35 units.
  // +0.4 so the first place is fully on-stage at p=0 (no blank first paint).
  const span = count - 0.35;
  return p * span - index + 0.4;
}

function layerMotion(t: number) {
  // t: 0 start enter, ~0.35 full, ~0.65 start exit, 1 gone
  // Ghost leads; main content follows. Alpha on both enter and exit.
  const ghostEnter = easeInOut(clamp(t / 0.3, 0, 1));
  const mainEnter = easeInOut(clamp((t - 0.14) / 0.32, 0, 1));
  const exit = easeInOut(clamp((t - 0.62) / 0.38, 0, 1));
  const live = t >= 0 && t <= 1;
  const ghostOpacity = live ? ghostEnter * (1 - exit) : 0;
  const mainOpacity = live ? mainEnter * (1 - exit) : 0;
  const ghostX = (1 - ghostEnter) * -42 + exit * 40;
  const mainX = (1 - mainEnter) * -34 + exit * 38;
  return { ghostOpacity, mainOpacity, ghostX, mainX, mainEnter, exit };
}

function paintGotyCountdown(p: number, frame: HTMLElement) {
  const layers = frame.querySelectorAll<HTMLElement>("[data-c-place]");
  const count = layers.length;
  layers.forEach((layer, i) => {
    const t = localT(p, i, count);
    const { ghostOpacity, mainOpacity, ghostX, mainX, mainEnter } =
      layerMotion(t);
    const ghost = layer.querySelector<HTMLElement>("[data-c-ghost]");
    const main = layer.querySelector<HTMLElement>("[data-c-main]");
    if (ghost) {
      ghost.style.opacity = String(ghostOpacity);
      ghost.style.transform = `translate3d(${ghostX}vw, -50%, 0)`;
    }
    if (main) {
      main.style.opacity = String(mainOpacity);
      main.style.transform = `translate3d(${mainX}vw, 0, 0)`;
    }
    layer.style.pointerEvents = mainOpacity > 0.4 ? "auto" : "none";
    layer.style.zIndex = String(
      Math.round(mainOpacity * 10 + mainEnter * 4),
    );
  });
}

function GotyCountdown({
  year,
  places,
}: {
  year: number;
  places: EditionGotyStandingRow[];
}) {
  const groups = groupByRank(places);
  const n = Math.max(groups.length, 1);
  // ~100vh of scroll per place — calm, but one viewport so handoffs are horizontal.
  const heightVh = 40 + n * 100;

  return (
    <CeremonyChapter
      eyebrow={`${year} Edition · Ceremony`}
      title="Game of the Year"
      heightVh={heightVh}
      paint={paintGotyCountdown}
    >
      <div className="relative h-full w-full">
        {groups.map((group, i) => {
          const row = group.rows[0]!;
          const featured = group.rank === 1;
          // First place visible before paint() runs (avoids a blank stage on slow iOS).
          const boot = i === 0;
          return (
            <div
              key={`${group.rank}-${row.gameId}`}
              data-c-place
              className="absolute inset-0 flex items-center overflow-hidden px-[var(--gutter)] pt-[7.5rem] sm:pt-36"
            >
              <p
                data-c-ghost
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-[4%] z-0 font-display leading-none tracking-tight text-accent/30 will-change-transform sm:right-[6%]"
                style={{
                  fontSize: featured
                    ? "clamp(7rem, 24vw, 14rem)"
                    : "clamp(5.5rem, 18vw, 11rem)",
                  opacity: boot ? 1 : 0,
                  transform: boot
                    ? "translate3d(0, -50%, 0)"
                    : "translate3d(-42vw, -50%, 0)",
                }}
              >
                {group.rank}
              </p>

              <div
                data-c-main
                className="relative z-10 mx-auto flex w-full max-w-[var(--page-max)] items-end gap-6 will-change-transform sm:gap-10 md:gap-14"
                style={{
                  opacity: boot ? 1 : 0,
                  transform: boot
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(-34vw, 0, 0)",
                }}
              >
                <Link
                  href={`/games/${row.slug}`}
                  className={`relative block shrink-0 ${
                    featured
                      ? "w-[min(52vw,240px)] md:w-[280px]"
                      : "w-[min(48vw,200px)] md:w-[240px]"
                  }`}
                  draggable={false}
                >
                  <CeremonyArt
                    title={row.title}
                    coverUrl={row.coverUrl}
                    priority={i < 3 || featured}
                  />
                </Link>

                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                    Game of the Year
                  </p>
                  <p
                    className={`mt-2 font-display leading-none tracking-wide text-accent ${
                      featured ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl"
                    }`}
                  >
                    #{group.rank}
                  </p>
                  <h3
                    className={`mt-3 font-display leading-[0.95] tracking-wide text-ink ${
                      featured
                        ? "text-[clamp(1.75rem,4vw,3rem)]"
                        : "text-[clamp(1.5rem,3.5vw,2.5rem)]"
                    }`}
                  >
                    <Link href={`/games/${row.slug}`} className="hover:text-accent">
                      {row.title}
                    </Link>
                  </h3>
                  {group.rows.length > 1 ? (
                    <ul className="mt-3 space-y-1">
                      {group.rows.slice(1).map((tied) => (
                        <li key={tied.gameId}>
                          <Link
                            href={`/games/${tied.slug}`}
                            className="font-display text-lg text-ink hover:text-accent sm:text-xl"
                          >
                            {tied.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CeremonyChapter>
  );
}

type CatSlot = {
  place: number;
  slug: string;
  title: string;
  coverUrl: string | null;
};

type CatAward = {
  categoryId: string;
  label: string;
  description: string | null;
  rows: CatSlot[];
};

/**
 * One sticky stage for all category awards.
 * Title settles and holds still, then #3 → #2 → #1 with gaps;
 * exit only after #1 is fully in. Layout stays #1 · #2 · #3.
 */
function paintCategoriesCountdown(p: number, frame: HTMLElement) {
  const awards = frame.querySelectorAll<HTMLElement>("[data-c-award]");
  const count = awards.length;
  awards.forEach((award, i) => {
    // Less neighbor overlap than GOTY so each award can finish its beat.
    const t = count <= 1 ? Math.max(p, 0.55) : p * (count - 0.12) - i + 0.55;
    const inWindow = t > -0.05 && t < 1.08;

    // Title settles by ~0.22, then stays put (x=0) until exit.
    const titleEnter = easeInOut(clamp(t / 0.22, 0, 1));
    // #3 @ 0.30, #2 @ 0.50, #1 @ 0.70 → #1 full ~0.88; hold; exit @ 0.94
    const exit = easeInOut(clamp((t - 0.94) / 0.1, 0, 1));

    award.style.opacity = inWindow ? "1" : "0";
    award.style.pointerEvents =
      inWindow && exit < 0.85 && titleEnter > 0.5 ? "auto" : "none";
    award.style.zIndex = String(
      Math.round((1 - Math.abs(clamp(t, 0, 1) - 0.5)) * 10),
    );

    const title = award.querySelector<HTMLElement>("[data-c-award-title]");
    if (title) {
      const titleOpacity = inWindow ? titleEnter * (1 - exit) : 0;
      const titleX = (1 - titleEnter) * -28 + exit * 34;
      title.style.opacity = String(titleOpacity);
      title.style.transform = `translate3d(${titleX}vw, 0, 0)`;
    }

    const slots = award.querySelectorAll<HTMLElement>("[data-c-slot]");
    slots.forEach((slot) => {
      const place = Number(slot.dataset.place ?? "1");
      const appear = place === 3 ? 0 : place === 2 ? 1 : 2;
      const start = 0.3 + appear * 0.2;
      const slotEnter = easeInOut(clamp((t - start) / 0.18, 0, 1));
      const slotOpacity = inWindow ? slotEnter * (1 - exit) : 0;
      const slotX = (1 - slotEnter) * -30 + exit * 36;
      slot.style.opacity = String(slotOpacity);
      slot.style.transform = `translate3d(${slotX}vw, 0, 0)`;
    });
  });
}

function CategoriesCountdown({
  year,
  awards,
}: {
  year: number;
  awards: CatAward[];
}) {
  const n = Math.max(awards.length, 1);
  // Title settle → games → hold on full board → exit.
  const heightVh = 80 + n * 170;

  return (
    <CeremonyChapter
      eyebrow={`${year} Edition · Awards`}
      title="Categories"
      heightVh={heightVh}
      paint={paintCategoriesCountdown}
    >
      <div className="relative h-full w-full">
        {awards.map((cat, awardIndex) => {
          const grouped = groupByRank(
            cat.rows.map((r) => ({ ...r, rank: r.place })),
          );
          const board = [1, 2, 3].map((n) => {
            const g = grouped.find((x) => x.rank === n);
            return g ? { rank: n, rows: g.rows } : null;
          });
          const boot = awardIndex === 0;
          return (
            <div
              key={cat.categoryId}
              data-c-award
              className="absolute inset-0 flex flex-col justify-center overflow-hidden px-[var(--gutter)] pt-[7.5rem] sm:pt-36"
              style={{ opacity: boot ? 1 : 0 }}
            >
              <div
                data-c-award-title
                className="mx-auto w-full max-w-[var(--page-max)] will-change-transform"
                style={{
                  opacity: boot ? 1 : 0,
                  transform: boot
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(-28vw, 0, 0)",
                }}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                  Category award
                </p>
                <h3 className="mt-2 font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.92] tracking-wide text-ink">
                  {cat.label}
                </h3>
                {cat.description ? (
                  <p className="mt-2 max-w-xl font-serif text-sm text-muted">
                    {cat.description}
                  </p>
                ) : null}
              </div>

              <ul className="mx-auto mt-8 flex w-full max-w-[var(--page-max)] items-end gap-4 sm:mt-10 sm:gap-6 md:gap-8">
                {board.map((slot, i) => {
                  if (!slot) {
                    return (
                      <li key={`e-${i}`} className="min-w-0 flex-1" aria-hidden />
                    );
                  }
                  const row = slot.rows[0]!;
                  const featured = slot.rank === 1;
                  return (
                    <li
                      key={`${cat.categoryId}-${slot.rank}-${row.slug}`}
                      data-c-slot
                      data-place={slot.rank}
                      className={`min-w-0 will-change-transform ${
                        featured ? "w-[36%] max-w-[240px]" : "w-[30%] max-w-[180px]"
                      }`}
                      style={{
                        opacity: boot ? 1 : 0,
                        transform: boot
                          ? "translate3d(0, 0, 0)"
                          : "translate3d(-30vw, 0, 0)",
                      }}
                    >
                      <Link
                        href={`/games/${row.slug}`}
                        className="group block"
                        draggable={false}
                      >
                        <p
                          className={`font-display leading-none text-accent ${
                            featured
                              ? "text-4xl sm:text-5xl"
                              : "text-3xl sm:text-4xl"
                          }`}
                        >
                          #{slot.rank}
                        </p>
                        <div className="mt-2">
                          <CeremonyArt
                            title={row.title}
                            coverUrl={row.coverUrl}
                            priority={featured}
                          />
                        </div>
                        <p
                          className={`mt-3 font-display leading-snug text-ink group-hover:text-accent ${
                            featured
                              ? "text-xl sm:text-2xl"
                              : "text-lg sm:text-xl"
                          }`}
                        >
                          {row.title}
                        </p>
                      </Link>
                      {slot.rows.length > 1 ? (
                        <ul className="mt-2 space-y-1">
                          {slot.rows.slice(1).map((tied) => (
                            <li key={tied.slug}>
                              <Link
                                href={`/games/${tied.slug}`}
                                className="font-display text-sm text-ink hover:text-accent"
                              >
                                {tied.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </CeremonyChapter>
  );
}

function CeremonySummary({
  year,
  topTen,
  categoryPodiums,
}: {
  year: number;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
}) {
  const gotyAsc = [...topTen]
    .filter((r) => r.rank >= 1 && r.rank <= 10)
    .sort((a, b) => a.rank - b.rank || a.place - b.place);

  const winners = categoryPodiums
    .map((cat) => {
      const games = cat.rows.filter((r) => r.rank === 1);
      if (games.length === 0) return null;
      return {
        categoryId: cat.categoryId,
        label: cat.label,
        games,
      };
    })
    .filter((w): w is NonNullable<typeof w> => w != null);

  return (
    <section className="border-t border-line px-[var(--gutter)] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[var(--page-max)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
          {year} Edition · Summary
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[0.9] tracking-wide text-ink">
          The board
        </h2>

        {gotyAsc.length > 0 ? (
          <div className="mt-8 sm:mt-10">
            <h3 className="font-display text-xl tracking-wide text-ink sm:text-2xl">
              Game of the Year · Top 10
            </h3>
            <ol className="mt-4 grid grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {gotyAsc.map((row) => (
                <li key={row.gameId} className="min-w-0">
                  <Link
                    href={`/games/${row.slug}`}
                    className="group block"
                    draggable={false}
                  >
                    <p className="font-display text-sm leading-none text-accent sm:text-base">
                      #{row.rank}
                    </p>
                    <div className="mt-1">
                      <CeremonyArt
                        title={row.title}
                        coverUrl={row.coverUrl}
                        priority={row.rank <= 3}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 font-display text-[11px] leading-snug text-ink group-hover:text-accent sm:text-xs">
                      {row.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {winners.length > 0 ? (
          <div className="mt-10 sm:mt-12">
            <h3 className="font-display text-xl tracking-wide text-ink sm:text-2xl">
              Category winners
            </h3>
            <ul
              className={`mt-4 grid gap-3 sm:gap-4 ${
                winners.length <= 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : winners.length <= 6
                    ? "grid-cols-3 sm:grid-cols-6"
                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
              }`}
            >
              {winners.map((w) => {
                const first = w.games[0]!;
                return (
                  <li key={w.categoryId} className="min-w-0">
                    <Link
                      href={`/games/${first.slug}`}
                      className="group block"
                      draggable={false}
                    >
                      <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                        {w.label}
                      </p>
                      <div className="mt-1.5">
                        <CeremonyArt
                          title={first.title}
                          coverUrl={first.coverUrl}
                        />
                      </div>
                      <p className="mt-1.5 line-clamp-2 font-display text-[11px] leading-snug text-ink group-hover:text-accent sm:text-xs">
                        {first.title}
                      </p>
                    </Link>
                    {w.games.length > 1 ? (
                      <ul className="mt-1 space-y-0.5">
                        {w.games.slice(1).map((tied) => (
                          <li key={tied.gameId}>
                            <Link
                              href={`/games/${tied.slug}`}
                              className="line-clamp-2 font-display text-[11px] leading-snug text-ink hover:text-accent sm:text-xs"
                            >
                              {tied.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <p className="mt-12 font-serif text-sm text-muted">
          Continue in Highlights for the full board.
        </p>
      </div>
    </section>
  );
}

/**
 * Reveal — one sticky viewport per chapter (title + stage together) so
 * handoffs stay horizontal and iOS Safari doesn’t break nested sticky.
 */
export function EditionRevealView({
  year,
  topTen,
  categoryPodiums,
}: {
  year: number;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
}) {
  const gotyDesc = groupByRank(
    [...topTen]
      .filter((r) => r.rank >= 1 && r.rank <= 10)
      .sort((a, b) => a.rank - b.rank || a.place - b.place),
  )
    .reverse()
    .flatMap((g) => g.rows);

  return (
    <ReducedMotionProvider>
      <div className="reveal-ceremony -mx-[var(--gutter)] w-[calc(100%+2*var(--gutter))]">
        {gotyDesc.length === 0 ? (
          <section className="border-b border-line px-[var(--gutter)] py-16">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
              {year} Edition · Ceremony
            </p>
            <h2 className="mt-1 font-display text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.9] tracking-wide text-ink">
              Game of the Year
            </h2>
            <p className="mt-8 text-center text-muted">
              No Game of the Year scores for this mode.
            </p>
          </section>
        ) : (
          <GotyCountdown year={year} places={gotyDesc} />
        )}

        {categoryPodiums.length > 0 ? (
          <CategoriesCountdown
            year={year}
            awards={categoryPodiums.map((c) => ({
              categoryId: c.categoryId,
              label: c.label,
              description: c.description,
              rows: c.rows.map((r) => ({
                place: r.rank,
                slug: r.slug,
                title: r.title,
                coverUrl: r.coverUrl,
              })),
            }))}
          />
        ) : null}

        <CeremonySummary
          year={year}
          topTen={topTen}
          categoryPodiums={categoryPodiums}
        />
      </div>
    </ReducedMotionProvider>
  );
}
