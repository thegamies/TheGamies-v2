"use client";

import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { useEditionCategoryPodiums } from "@/components/communities/EditionCategoryDebug";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import {
  applyCategoryRevealGridColumns,
  CATEGORY_REVEAL_EXIT_AT,
  CATEGORY_REVEAL_EXIT_DUR,
  categoryRevealColPx,
  categoryRevealGridCell,
  categoryRevealAwardLocalT,
  categoryRevealAwardScrollUnits,
  categoryRevealGridOffscreenLead,
  categoryRevealPlaceGridEnter,
  categoryRevealPlaceLabelEnter,
  categoryRevealPlaceOpens,
  categoryRevealPlaceTranslateX,
  categoryRevealSlotDensity,
} from "@/lib/communities/edition-reveal-category-ties";
import {
  CATEGORY_REVEAL_FIT,
  categoryRevealAwardFit,
  categoryRevealSoloPreferredW,
  categoryRevealTitleBlockH,
  GOTY_REVEAL_FIT,
  gotyRevealCoverFloor,
  gotyRevealFit,
  gotyRevealPreferredCoverW,
  type CategoryRevealPlaceFitInput,
  type GotyRevealFit,
} from "@/lib/communities/edition-reveal-fit";
import { ceremonyProgress, documentOffsetTop } from "@/lib/communities/edition-reveal-scrub";
import {
  gotyRevealGameLocal,
  gotyRevealGameMotion,
  gotyRevealLocalT,
  gotyRevealNumber,
  gotyRevealNumberShift,
  gotyRevealRankUnits,
  gotyRevealTied,
} from "@/lib/communities/edition-reveal-motion";
import { groupByRank } from "@/lib/standings/shared-rank";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

type RevealStageBox = {
  headH: number;
  frameW: number;
  frameH: number;
  stageH: number;
};

function revealStageBox(
  frame: HTMLElement,
  boxEl?: HTMLElement | null,
): RevealStageBox {
  const head = frame.parentElement?.querySelector<HTMLElement>("[data-c-head]");
  const headH = Math.ceil(head?.getBoundingClientRect().height ?? 108);
  const box = boxEl ?? frame;
  const frameW = Math.max(1, box.clientWidth || frame.clientWidth);
  const frameH = Math.max(1, box.clientHeight || frame.clientHeight);
  return {
    headH,
    frameW,
    frameH,
    stageH: Math.max(1, frameH - headH),
  };
}

function gotyLayerFit(
  layer: HTMLElement,
  stage: RevealStageBox,
): GotyRevealFit {
  const featured = layer.dataset.featured === "1";
  const num = layer.querySelector<HTMLElement>("[data-c-num]");
  const tied = layer.querySelector<HTMLElement>("[data-c-tied]");
  const box = {
    width: Math.max(1, num?.offsetWidth ?? 120),
    height: Math.max(1, num?.offsetHeight ?? 120),
  };
  const parkedShift = gotyRevealNumberShift(
    { enter: 1, park: 1, scale: 0.57 },
    box,
    {
      width: stage.frameW,
      height: stage.stageH,
      topInset: GOTY_REVEAL_FIT.topInset,
      sideInset: 16,
    },
  );
  return gotyRevealFit({
    stageH: stage.stageH,
    preferredCoverW: gotyRevealPreferredCoverW(featured, stage.frameW),
    parkedGlyphH: box.height * parkedShift.scale,
    tiedH: tied?.offsetHeight ?? 0,
    coverFloor: gotyRevealCoverFloor(featured),
    topInset: GOTY_REVEAL_FIT.topInset,
  });
}

function applyGotyCoverWidth(layer: HTMLElement, coverW: number) {
  layer.querySelectorAll<HTMLElement>("[data-c-cover]").forEach((el) => {
    el.style.width = `${coverW}px`;
    el.style.minWidth = `${coverW}px`;
  });
}

function categoryStackRows(value: string | undefined): 1 | 2 | 3 {
  const n = Number(value || "1");
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

function categoryPlaceFitInput(
  placeEl: HTMLElement,
  viewportWidth: number,
): CategoryRevealPlaceFitInput {
  const stackRows = categoryStackRows(placeEl.dataset.stackRows);
  const hero = placeEl.dataset.hero === "1";
  const showTitles = placeEl.dataset.showTitles !== "0";
  const mosaic = stackRows > 1;
  const preferredW = mosaic
    ? categoryRevealColPx(
        stackRows === 2 ? "editorial" : "dense",
        viewportWidth,
      )
    : categoryRevealSoloPreferredW(hero, viewportWidth);
  const titleKind = mosaic ? "mosaic" : hero ? "hero" : "solo";
  const floor = hero
    ? CATEGORY_REVEAL_FIT.heroFloor
    : mosaic
      ? CATEGORY_REVEAL_FIT.mosaicFloor
      : CATEGORY_REVEAL_FIT.soloFloor;
  const rowGap =
    stackRows === 3
      ? CATEGORY_REVEAL_FIT.denseGap
      : stackRows === 2
        ? CATEGORY_REVEAL_FIT.editorialGap
        : 0;
  return {
    stackRows,
    preferredW,
    showTitles,
    hero,
    rowGap,
    titleBlockH: categoryRevealTitleBlockH(titleKind, viewportWidth),
    floor,
  };
}

function applyCategoryAwardFit(award: HTMLElement) {
  const vw = window.innerWidth;
  const body = award.querySelector<HTMLElement>("[data-c-award-body]");
  const title = award.querySelector<HTMLElement>("[data-c-award-title]");
  const stageWrap = award.querySelector<HTMLElement>("[data-c-board-stage]");
  const placeEls = [
    ...award.querySelectorAll<HTMLElement>("[data-c-place]"),
  ];
  const availableH = Math.max(1, body?.clientHeight ?? award.clientHeight);
  const awardChromeH =
    title && stageWrap
      ? Math.max(0, stageWrap.offsetTop - title.offsetTop)
      : (title?.offsetHeight ?? 0) + 20;
  let placeHeadH = 0;
  placeEls.forEach((el) => {
    const head = el.querySelector<HTMLElement>("[data-c-place-head]");
    placeHeadH = Math.max(placeHeadH, head?.offsetHeight ?? 0);
  });
  const fit = categoryRevealAwardFit({
    availableH,
    awardChromeH,
    placeHeadH,
    places: placeEls.map((el) => categoryPlaceFitInput(el, vw)),
  });
  if (body) body.style.justifyContent = fit.align;
  placeEls.forEach((placeEl, i) => {
    const w = fit.widths[i];
    if (w == null) return;
    const grid = placeEl.querySelector<HTMLElement>("[data-c-place-grid]");
    if (!grid) return;
    if (categoryRevealGridCell(grid)) {
      applyCategoryRevealGridColumns(grid, vw, w);
    } else {
      grid.style.width = `${w}px`;
      grid.style.maxWidth = `${w}px`;
    }
  });
}

type PaintFn = (progress: number, frame: HTMLElement) => void;

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

/**
 * One sticky viewport for the whole chapter (title + stage).
 * Nested sticky (title then stage) breaks scrubbing on iOS Safari.
 * Stage uses grid + absolute fill — flex-1 children often collapse to 0
 * height on iPhone, which hid every place/award layer.
 *
 * Safari often skips `scroll` during momentum; keep a rAF loop while the
 * chapter is on screen so Chrome and Safari scrub the same way.
 */
function CeremonyChapter({
  eyebrow,
  title,
  heightVh,
  paint,
  fadeHead = false,
  children,
}: {
  eyebrow: string;
  title: string;
  heightVh: number;
  paint: PaintFn;
  fadeHead?: boolean;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef(paint);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    paintRef.current = paint;
  });

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    const stage = stageRef.current;
    const head = headRef.current;
    if (!track || !frame || !stage || !head) return;

    let raf = 0;
    let trackDocTop = documentOffsetTop(track);
    let openerStartTop: number | null = null;
    const opener = track.previousElementSibling instanceof HTMLElement
      ? track.previousElementSibling
      : null;
    const scrollRoot =
      (document.scrollingElement as HTMLElement | null) ??
      document.documentElement;

    const measure = () => {
      trackDocTop = documentOffsetTop(track);
      openerStartTop = null;
    };

    const apply = () => {
      const viewportH = Math.max(1, window.innerHeight);

      if (reduced) {
        head.style.opacity = "1";
        stage.dataset.revealReduced = "1";
        paintRef.current(0, stage);
        raf = 0;
        return;
      }
      stage.dataset.revealReduced = "0";

      const frameH = Math.max(1, frame.offsetHeight || viewportH);
      const p = ceremonyProgress(
        scrollRoot.scrollTop,
        trackDocTop,
        track.offsetHeight,
        frameH,
      );
      paintRef.current(p, stage);

      if (fadeHead && opener) {
        const top = opener.getBoundingClientRect().top;
        if (openerStartTop == null) openerStartTop = top;
        const gone = Math.max(0, openerStartTop - top);
        head.style.opacity = String(easeInOut(clamp(gone / 320, 0, 1)));
      } else if (fadeHead) {
        const top = frame.getBoundingClientRect().top;
        head.style.opacity = String(easeInOut(clamp(1 - top / 320, 0, 1)));
      } else {
        head.style.opacity = "1";
      }

      const rect = track.getBoundingClientRect();
      const onScreen = rect.bottom > 0 && rect.top < viewportH;
      raf = onScreen ? requestAnimationFrame(apply) : 0;
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onResize = () => {
      measure();
      kick();
    };

    measure();
    kick();
    scrollRoot.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("scroll", kick, { passive: true });
    document.addEventListener("scroll", kick, { passive: true, capture: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("touchmove", kick, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", kick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scrollRoot.removeEventListener("scroll", kick);
      window.removeEventListener("scroll", kick);
      document.removeEventListener("scroll", kick, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("touchmove", kick);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", kick);
    };
  }, [reduced, fadeHead]);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${heightVh}vh` }}>
      <div
        ref={frameRef}
        className="sticky top-0 overflow-hidden bg-paper"
        style={{ height: "100vh", maxHeight: "100dvh" }}
      >
        {/* Full-bleed stage first so it always owns the viewport box on iOS. */}
        <div ref={stageRef} className="absolute inset-0">
          {children}
        </div>

        <div
          ref={headRef}
          data-c-head
          className="absolute inset-x-0 top-0 z-20 border-b border-line bg-paper/95 px-[var(--gutter)]"
          style={{
            paddingTop: "1.1rem",
            paddingBottom: "0.85rem",
            opacity: fadeHead && !reduced ? 0 : 1,
          }}
        >
          <div className="relative mx-auto w-full max-w-[var(--page-max)]">
            <div
              aria-hidden
              className="absolute -left-[var(--gutter)] top-0 bottom-0 w-1 bg-accent"
            />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.18em]">
              {eyebrow}
            </p>
            <h2 className="mt-1 font-display text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.9] tracking-wide text-ink">
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
  mosaic = false,
}: {
  title: string;
  coverUrl: string | null;
  priority?: boolean;
  /** Category mosaic cell — fixed-ratio box, no intrinsic img size fights. */
  mosaic?: boolean;
}) {
  if (mosaic) {
    return (
      <div className="category-reveal-cover">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            draggable={false}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-1">
            <p className="font-display text-[10px] leading-none text-muted">
              {title}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-w-0 overflow-hidden border border-line bg-panel"
      style={{ aspectRatio: "3 / 4" }}
    >
      {coverUrl ? (
        // Native img: Next/Image + opacity/transform often blanks in Safari.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          className="absolute inset-0 block h-full w-full max-w-full object-cover"
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

function paintGotyNumber(
  num: HTMLElement,
  frame: HTMLElement,
  motion: { opacity: number; enter: number; park: number; scale: number },
  parkY?: number,
) {
  const boxEl =
    (num.offsetParent instanceof HTMLElement ? num.offsetParent : null) ??
    frame;
  const stage = revealStageBox(frame, boxEl);
  const shift = gotyRevealNumberShift(
    motion,
    {
      width: Math.max(1, num.offsetWidth),
      height: Math.max(1, num.offsetHeight),
    },
    {
      width: stage.frameW,
      height: stage.stageH,
      topInset: GOTY_REVEAL_FIT.topInset,
      sideInset: 16,
      parkY,
    },
  );
  const bw = Math.max(1, num.offsetWidth);
  const bh = Math.max(1, num.offsetHeight);
  const cx = stage.frameW / 2 + shift.x;
  const cy = stage.headH + stage.stageH / 2 + shift.y;
  // Pixel translate from top-left — avoids Chrome mobile bugs with
  // left/top 50% + translate(-50%, -50%) + scale.
  num.style.left = "0px";
  num.style.top = "0px";
  num.style.right = "auto";
  num.style.bottom = "auto";
  num.style.opacity = String(motion.opacity);
  num.style.transformOrigin = "center center";
  num.style.transform = `translate3d(${cx - bw / 2}px, ${cy - bh / 2}px, 0) scale(${shift.scale})`;
}

function paintGotyTied(
  tied: HTMLElement,
  frame: HTMLElement,
  motion: { opacity: number; yVh: number },
) {
  const boxEl =
    (tied.offsetParent instanceof HTMLElement ? tied.offsetParent : null) ??
    frame;
  const stage = revealStageBox(frame, boxEl);
  const bw = Math.max(1, tied.offsetWidth);
  const bh = Math.max(1, tied.offsetHeight);
  const cx = stage.frameW / 2;
  const cy = stage.headH + stage.stageH / 2 + (motion.yVh / 100) * stage.stageH;
  // Keep “Tied” fully on-screen horizontally (wide tracking on mobile).
  const pad = 12;
  const left = clamp(
    cx - bw / 2,
    pad,
    Math.max(pad, stage.frameW - pad - bw),
  );
  tied.style.left = "0px";
  tied.style.top = "0px";
  tied.style.right = "auto";
  tied.style.bottom = "auto";
  tied.style.opacity = String(motion.opacity);
  tied.style.transformOrigin = "center center";
  tied.style.transform = `translate3d(${left}px, ${cy - bh / 2}px, 0)`;
}

function paintGotyReduced(frame: HTMLElement) {
  const layers = frame.querySelectorAll<HTMLElement>("[data-c-place]");
  const stage = revealStageBox(frame);
  layers.forEach((layer, i) => {
    const on = i === 0;
    const fit = gotyLayerFit(layer, stage);
    applyGotyCoverWidth(layer, fit.coverW);
    const num = layer.querySelector<HTMLElement>("[data-c-num]");
    const tied = layer.querySelector<HTMLElement>("[data-c-tied]");
    const games = layer.querySelectorAll<HTMLElement>("[data-c-game]");
    if (num) {
      paintGotyNumber(
        num,
        frame,
        {
          opacity: on ? 1 : 0,
          enter: 1,
          park: 1,
          scale: 0.57,
        },
        fit.parkY,
      );
    }
    if (tied) {
      const show = on && games.length > 1;
      paintGotyTied(tied, frame, {
        opacity: show ? 1 : 0,
        yVh: fit.parkYVh,
      });
    }
    games.forEach((game, gi) => {
      game.style.opacity = on ? "1" : "0";
      game.style.pointerEvents = on ? "auto" : "none";
      if (on && games.length > 1) {
        const spread = Math.min(14, 36 / games.length);
        const scale = Math.max(0.48, 0.82 - games.length * 0.06);
        const x = (gi - (games.length - 1) / 2) * spread;
        game.style.transform = `translate3d(${x}vw, 8vh, 0) scale(${scale})`;
      } else {
        game.style.transform = "translate3d(0, 0, 0)";
      }
    });
    layer.style.pointerEvents = on ? "auto" : "none";
    layer.style.zIndex = on ? "10" : "0";
  });
}

function paintGotyCountdown(p: number, frame: HTMLElement) {
  if (frame.dataset.revealReduced === "1") {
    paintGotyReduced(frame);
    return;
  }

  const layers = [...frame.querySelectorAll<HTMLElement>("[data-c-place]")];
  const units = layers.map((layer) =>
    gotyRevealRankUnits(Number(layer.dataset.games ?? "1")),
  );
  const stage = revealStageBox(frame);

  layers.forEach((layer, i) => {
    const rankUnits = units[i] ?? 1;
    const t = gotyRevealLocalT(p, i, units);
    const gameEls = layer.querySelectorAll<HTMLElement>("[data-c-game]");
    const tied = gameEls.length > 1;
    const num = layer.querySelector<HTMLElement>("[data-c-num]");
    const tiedEl = layer.querySelector<HTMLElement>("[data-c-tied]");
    const fit = gotyLayerFit(layer, stage);
    applyGotyCoverWidth(layer, fit.coverW);
    const n = gotyRevealNumber(t, rankUnits);
    const k = gotyRevealTied(t, tied, rankUnits, fit.parkYVh);

    if (num) paintGotyNumber(num, frame, n, fit.parkY);
    if (tiedEl) paintGotyTied(tiedEl, frame, k);

    let maxGame = 0;
    gameEls.forEach((game, gi) => {
      game.style.paddingTop = `${stage.headH}px`;
      const gT = gotyRevealGameLocal(
        t,
        gi,
        gameEls.length,
        tied,
        rankUnits,
      );
      const m = gotyRevealGameMotion(gT);
      maxGame = Math.max(maxGame, m.opacity);
      game.style.opacity = String(m.opacity);
      game.style.transform = `translate3d(${m.xVw}vw, 0, 0)`;
      game.style.pointerEvents = m.opacity > 0.4 ? "auto" : "none";
    });

    layer.style.pointerEvents =
      n.opacity > 0.35 || maxGame > 0.4 ? "auto" : "none";
    layer.style.zIndex = String(Math.round(n.opacity * 8 + maxGame * 8));
  });
}

function GotyCountdown({
  year,
  communityName,
  places,
}: {
  year: number;
  communityName: string;
  places: EditionGotyStandingRow[];
}) {
  const groups = groupByRank(places);
  const extra = groups.reduce(
    (sum, group) => sum + Math.max(0, group.rows.length - 1),
    0,
  );
  const heightVh = Math.min(1400, 40 + groups.length * 100 + extra * 80);

  return (
    <CeremonyChapter
      eyebrow={`${year} ${communityName} community`}
      title={`${year} Game of the Year`}
      heightVh={heightVh}
      paint={paintGotyCountdown}
      fadeHead
    >
      <div className="relative h-full w-full">
        {groups.map((group) => {
          const featured = group.rank === 1;
          const tied = group.rows.length > 1;
          const rankUnits = gotyRevealRankUnits(group.rows.length);
          const bootNum = gotyRevealNumber(0, rankUnits);
          return (
            <div
              key={`${group.rank}-${group.rows[0]!.gameId}`}
              data-c-place
              data-games={group.rows.length}
              data-featured={featured ? "1" : "0"}
              className="absolute inset-0 overflow-visible"
            >
              <p
                data-c-num
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 z-30 origin-center font-display leading-none tracking-tight will-change-transform"
                style={{
                  color: "#ff5a1f",
                  fontSize: featured
                    ? "clamp(5.5rem, 22vw, 15rem)"
                    : "clamp(5rem, 20vw, 13rem)",
                  opacity: bootNum.opacity,
                  transform: `translate3d(0, 0, 0) scale(${bootNum.scale})`,
                }}
              >
                {group.rank}
              </p>

              {tied ? (
                <p
                  data-c-tied
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0 z-[15] font-display leading-none tracking-[0.12em] text-ink will-change-transform"
                  style={{
                    fontSize: "clamp(2.25rem, 9vw, 6.5rem)",
                    opacity: 0,
                    transform: "translate3d(0, 0, 0)",
                  }}
                >
                  Tied
                </p>
              ) : null}

              {group.rows.map((row, gi) => (
                <div
                  key={row.gameId}
                  data-c-game
                  className="absolute inset-0 z-10 flex items-center px-[var(--gutter)] will-change-transform"
                  style={{
                    opacity: 0,
                    transform: "translate3d(-32vw, 0, 0)",
                    pointerEvents: "none",
                  }}
                >
                  <div className="relative mx-auto flex w-full max-w-[var(--page-max)] items-end gap-5 pr-[min(22vw,7rem)] sm:gap-10 md:gap-14">
                    <Link
                      href={`/games/${row.slug}`}
                      data-c-cover
                      className="relative block shrink-0"
                      style={{
                        width: featured
                          ? "min(48vw, 220px)"
                          : "min(44vw, 190px)",
                        minWidth: 112,
                      }}
                      draggable={false}
                    >
                      <CeremonyArt
                        title={row.title}
                        coverUrl={row.coverUrl}
                      />
                    </Link>

                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                        {tied ? `Tied for #${group.rank}` : "Game of the Year"}
                      </p>
                      {tied ? (
                        <p className="mt-2 font-display text-2xl leading-none tracking-wide text-accent sm:text-3xl">
                          {gi + 1} of {group.rows.length}
                        </p>
                      ) : null}
                      <h3
                        className={`mt-3 font-display leading-[0.95] tracking-wide text-ink ${
                          featured
                            ? "text-[clamp(1.75rem,4vw,3rem)]"
                            : "text-[clamp(1.5rem,3.5vw,2.5rem)]"
                        }`}
                      >
                        <Link
                          href={`/games/${row.slug}`}
                          className="hover:text-accent"
                        >
                          {row.title}
                        </Link>
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
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
 * Each award is a CategoryRevealBoard of #1 · #2 · #3 columns.
 * Columns stay full-size in layout; each slides in from off-screen left
 * via translate3d and packs stage-left (#3 → #2 → #1 push).
 */
function paintCategoriesCountdown(p: number, frame: HTMLElement) {
  const awards = frame.querySelectorAll<HTMLElement>("[data-c-award]");
  const count = awards.length;
  const reduced = frame.dataset.revealReduced === "1";
  const units = Array.from(awards).map((award) =>
    categoryRevealAwardScrollUnits(Number(award.dataset.placeCount || "1")),
  );

  awards.forEach((award, i) => {
    const t =
      count <= 1
        ? Math.max(p, 0.35)
        : categoryRevealAwardLocalT(p, i, units);
    const inWindow = t > -0.05 && t < 1.08;

    const titleEnter = easeInOut(clamp(t / 0.16, 0, 1));
    const exit = easeInOut(
      clamp((t - CATEGORY_REVEAL_EXIT_AT) / CATEGORY_REVEAL_EXIT_DUR, 0, 1),
    );
    const live = inWindow ? 1 - exit : 0;

    // Vertically center in the stage *below* the live ceremony head height.
    const stageBox = revealStageBox(frame);
    award.style.paddingTop = `${stageBox.headH}px`;
    award.style.paddingBottom = "0px";
    applyCategoryAwardFit(award);

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

    const board = award.querySelector<HTMLElement>("[data-c-board]");
    const stage = board?.parentElement;
    const stageW = Number(
      stage?.dataset.stageWidth ||
        stage?.clientWidth ||
        frame.clientWidth ||
        0,
    );
    const offscreenLead = Math.max(stageW * 0.92, 1);
    const gridLead = categoryRevealGridOffscreenLead(stageW);
    const gapPx = Number(board?.dataset.placeGap || "20");
    const placeEls = award.querySelectorAll<HTMLElement>("[data-c-place]");
    const layouts = Array.from(placeEls).map((el) => ({
      place: Number(el.dataset.place ?? "0"),
      left: el.offsetLeft,
      width: el.offsetWidth,
    }));
    const opens = categoryRevealPlaceOpens(t, layouts, reduced);

    if (board) {
      board.style.opacity = String(titleEnter * live);
      board.style.transform = "translate3d(0, 0, 0)";
      board.style.gap = `${gapPx}px`;
    }

    placeEls.forEach((placeEl) => {
      const place = Number(placeEl.dataset.place ?? "1");
      const labelEnter = reduced
        ? 1
        : categoryRevealPlaceLabelEnter(
            t,
            place,
            layouts.map((row) => row.place),
          );
      const gridEnter = reduced
        ? 1
        : categoryRevealPlaceGridEnter(
            t,
            place,
            layouts.map((row) => row.place),
          );
      const tx = categoryRevealPlaceTranslateX(
        place,
        layouts,
        opens,
        offscreenLead,
        gapPx,
      );

      // Column seats with # / Tied first; covers stay clipped until their slide.
      placeEl.style.opacity = String(inWindow && labelEnter > 0.02 ? 1 : 0);
      placeEl.style.transform = `translate3d(${tx}px, 0, 0)`;
      placeEl.style.overflow = gridEnter < 0.995 ? "hidden" : "visible";
      placeEl.style.marginLeft = "";
      placeEl.style.width = "";
      placeEl.style.pointerEvents =
        live > 0.5 && gridEnter > 0.35 ? "auto" : "none";

      const num = placeEl.querySelector<HTMLElement>("[data-c-place-num]");
      const meta = placeEl.querySelector<HTMLElement>("[data-c-place-meta]");
      const grid = placeEl.querySelector<HTMLElement>("[data-c-place-grid]");
      if (num) {
        num.style.opacity = String(inWindow ? labelEnter * live : 0);
        num.style.transform = `translate3d(${(1 - labelEnter) * -6}vw, 0, 0)`;
      }
      if (meta) {
        meta.style.opacity = String(inWindow ? labelEnter * live : 0);
        meta.style.transform = `translate3d(${(1 - labelEnter) * -3}vw, 0, 0)`;
      }
      if (grid) {
        // Park fully off-screen left during the label beat, then slide in.
        const gx = (1 - gridEnter) * -gridLead;
        grid.style.opacity = String(
          inWindow && gridEnter > 0.02 ? Math.min(1, gridEnter * 1.15) * live : 0,
        );
        grid.style.transform = `translate3d(${gx}px, 0, 0)`;
      }
    });
  });
}

type CategoryBoardPlace = {
  rank: number;
  rows: CatSlot[];
};

/**
 * Podium board for one award: #1 · #2 · #3 columns in one component.
 * Layout is always full-size; ceremony slides each column in from the left.
 */
function CategoryRevealBoard({
  places,
  boot,
}: {
  places: CategoryBoardPlace[];
  boot: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bootRank =
    places.find((p) => p.rank === 3)?.rank ??
    places.find((p) => p.rank === 2)?.rank ??
    places[0]?.rank;

  useLayoutEffect(() => {
    const board = boardRef.current;
    const stage = stageRef.current;
    if (!board || !stage) return;

    const measureLayout = () => {
      const award = board.closest("[data-c-award]");
      if (award instanceof HTMLElement) applyCategoryAwardFit(award);
      stage.dataset.stageWidth = String(stage.clientWidth);
      board.querySelectorAll<HTMLElement>("[data-c-place]").forEach((el) => {
        el.dataset.offsetLeft = String(el.offsetLeft);
        el.dataset.fullWidth = String(el.offsetWidth);
      });
    };

    const applyPark = (opens: { 1: number; 2: number; 3: number }) => {
      measureLayout();
      const lead = Math.max(stage.clientWidth * 0.92, 1);
      const gapPx = Number(board.dataset.placeGap || "20");
      const layouts = Array.from(
        board.querySelectorAll<HTMLElement>("[data-c-place]"),
      ).map((el) => ({
        place: Number(el.dataset.place ?? "0"),
        left: Number(el.dataset.offsetLeft || "0"),
        width: Number(el.dataset.fullWidth || "0"),
      }));
      board.querySelectorAll<HTMLElement>("[data-c-place]").forEach((el) => {
        const place = Number(el.dataset.place ?? "0");
        const tx = categoryRevealPlaceTranslateX(
          place,
          layouts,
          opens,
          lead,
          gapPx,
        );
        el.style.transform = `translate3d(${tx}px, 0, 0)`;
        const open =
          place === 1 ? opens[1] : place === 2 ? opens[2] : opens[3];
        el.style.opacity = open > 0.02 ? "1" : "0";
      });
      if (boot) board.style.opacity = "1";
    };

    const opens = { 1: 0, 2: 0, 3: 0 };
    if (boot && (bootRank === 1 || bootRank === 2 || bootRank === 3)) {
      opens[bootRank] = 1;
    }
    applyPark(opens);

    const ro = new ResizeObserver(() => {
      measureLayout();
    });
    ro.observe(stage);
    ro.observe(board);
    return () => ro.disconnect();
  }, [places, boot, bootRank]);

  return (
    <div
      ref={stageRef}
      data-c-board-stage
      className="relative mx-auto mt-5 w-full max-w-[var(--page-max)] overflow-hidden sm:mt-6"
    >
      <div
        ref={boardRef}
        data-c-board
        data-place-gap="20"
        className="flex w-max items-start gap-5 sm:gap-8"
        style={{ opacity: boot ? 1 : 0, gap: "20px" }}
      >
        {places.map((place) => {
          const tied = place.rows.length > 1;
          const density = categoryRevealSlotDensity(place.rows.length, {
            rank: place.rank,
          });
          const bootOn = boot && place.rank === bootRank;

          return (
            <section
              key={place.rank}
              data-c-place
              data-place={place.rank}
              data-stack-rows={density.stackRows}
              data-hero={density.hero ? "1" : "0"}
              data-band={density.band}
              data-show-titles={density.showTitles ? "1" : "0"}
              className="shrink-0 overflow-hidden will-change-transform"
              style={{ opacity: 0 }}
            >
              <div
                data-c-place-head
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 will-change-transform"
              >
                <p
                  data-c-place-num
                  className={`font-display leading-none text-accent will-change-transform ${
                    density.hero
                      ? "text-4xl sm:text-5xl"
                      : "text-3xl sm:text-4xl"
                  }`}
                  style={{
                    opacity: bootOn ? 1 : 0,
                    transform: bootOn
                      ? "translate3d(0, 0, 0)"
                      : "translate3d(-8vw, 0, 0)",
                  }}
                >
                  #{place.rank}
                </p>
                {tied ? (
                  <p
                    data-c-place-meta
                    className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted will-change-transform"
                    style={{
                      opacity: bootOn ? 1 : 0,
                      transform: bootOn
                        ? "translate3d(0, 0, 0)"
                        : "translate3d(-4vw, 0, 0)",
                    }}
                  >
                    Tied
                    {density.showGameCount ? (
                      <span className="text-ink"> · {place.rows.length}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <ul
                data-c-place-grid
                className={`mt-2 will-change-transform ${density.gridClassName}`}
                style={{
                  ...density.gridStyle,
                  opacity: bootOn ? 1 : 0,
                  transform: bootOn ? "none" : "translate3d(-95%, 0, 0)",
                }}
              >
                {place.rows.map((row) => (
                  <li key={row.slug} className="min-w-0 w-full max-w-full">
                    <Link
                      href={`/games/${row.slug}`}
                      className="group block min-w-0"
                      draggable={false}
                      aria-label={row.title}
                    >
                      <CeremonyArt
                        title={row.title}
                        coverUrl={row.coverUrl}
                        mosaic
                      />
                      {density.showTitles ? (
                        <p
                          className={
                            density.stackRows === 1
                              ? `mt-1.5 line-clamp-2 font-display leading-snug text-ink group-hover:text-accent ${
                                  density.hero
                                    ? "text-lg sm:text-xl"
                                    : "text-base sm:text-lg"
                                }`
                              : "category-reveal-title mt-1 line-clamp-2 font-display text-ink group-hover:text-accent"
                          }
                        >
                          {row.title}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CategoriesCountdown({
  year,
  communityName,
  awards,
}: {
  year: number;
  communityName: string;
  awards: CatAward[];
}) {
  const placeUnits = awards.reduce((sum, cat) => {
    const grouped = groupByRank(
      cat.rows.map((r) => ({ ...r, rank: r.place })),
    );
    const placeCount = [1, 2, 3].filter((place) =>
      grouped.some((g) => g.rank === place),
    ).length;
    return sum + categoryRevealAwardScrollUnits(placeCount);
  }, 0);
  const coverExtra = awards.reduce((sum, cat) => {
    const grouped = groupByRank(
      cat.rows.map((r) => ({ ...r, rank: r.place })),
    );
    return (
      sum +
      grouped.reduce((s, g) => s + Math.max(0, g.rows.length - 1), 0)
    );
  }, 0);
  const heightVh = Math.min(2200, 70 + placeUnits * 115 + coverExtra * 3);

  return (
    <CeremonyChapter
      eyebrow={`${year} ${communityName} community`}
      title={`${year} Categories`}
      heightVh={heightVh}
      paint={paintCategoriesCountdown}
    >
      <div className="relative h-full w-full">
        {awards.map((cat, awardIndex) => {
          const grouped = groupByRank(
            cat.rows.map((r) => ({ ...r, rank: r.place })),
          );
          const places: CategoryBoardPlace[] = [1, 2, 3]
            .map((place) => {
              const g = grouped.find((x) => x.rank === place);
              if (!g) return null;
              return {
                rank: place,
                rows: g.rows.map((r) => ({
                  place: r.place,
                  slug: r.slug,
                  title: r.title,
                  coverUrl: r.coverUrl,
                })),
              };
            })
            .filter((s): s is CategoryBoardPlace => s != null);
          const boot = awardIndex === 0;
          return (
            <div
              key={cat.categoryId}
              data-c-award
              data-place-count={places.length}
              className="absolute inset-0 box-border flex flex-col overflow-hidden px-[var(--gutter)]"
              style={{ opacity: boot ? 1 : 0, paddingTop: "6.75rem" }}
            >
              <div
                data-c-award-body
                className="flex min-h-0 w-full flex-1 flex-col justify-center"
              >
                <div className="w-full shrink-0">
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
                    <h3 className="mt-2 font-display text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.9] tracking-wide text-ink">
                      {cat.label}
                    </h3>
                    {cat.description ? (
                      <p className="mt-2 max-w-xl font-serif text-sm text-muted">
                        {cat.description}
                      </p>
                    ) : null}
                  </div>

                  <CategoryRevealBoard places={places} boot={boot} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CeremonyChapter>
  );
}

function CeremonySummary({
  year,
  communityName,
  topTen,
  categoryPodiums,
}: {
  year: number;
  communityName: string;
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
    <section className="border-t border-line">
      <div
        className="sticky top-0 z-20 border-b border-line bg-paper/95 px-[var(--gutter)]"
        style={{ paddingTop: "1.1rem", paddingBottom: "0.85rem" }}
      >
        <div className="relative mx-auto w-full max-w-[var(--page-max)]">
          <div
            aria-hidden
            className="absolute -left-[var(--gutter)] top-0 bottom-0 w-1 bg-accent"
          />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.18em]">
            {year} {communityName} community
          </p>
          <h2 className="mt-1 font-display text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.9] tracking-wide text-ink">
            {year} Summary
          </h2>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10 sm:py-12">
        {gotyAsc.length > 0 ? (
          <div>
            <h3 className="font-display text-xl tracking-wide text-ink sm:text-2xl">
              Game of the Year · Top 10
            </h3>
            <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 md:gap-4">
              {gotyAsc.map((row) => (
                <li key={row.gameId} className="min-w-0">
                  <Link
                    href={`/games/${row.slug}`}
                    className="group block"
                    draggable={false}
                  >
                    <p className="font-display text-lg leading-none text-accent sm:text-xl">
                      #{row.rank}
                    </p>
                    <div className="mt-1">
                      <CeremonyArt
                        title={row.title}
                        coverUrl={row.coverUrl}
                        priority={row.rank <= 3}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 font-display text-base leading-snug text-ink group-hover:text-accent sm:text-lg">
                      {row.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {winners.length > 0 ? (
          <div className={gotyAsc.length > 0 ? "mt-10 sm:mt-12" : undefined}>
            <h3 className="font-display text-xl tracking-wide text-ink sm:text-2xl">
              Category winners
            </h3>
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 md:gap-4">
              {winners.map((w) => {
                const first = w.games[0]!;
                const tied = w.games.length > 1;
                return (
                  <li key={w.categoryId} className="min-w-0">
                    <p className="truncate text-xs font-extrabold uppercase tracking-[0.14em] text-muted sm:text-sm">
                      {w.label}
                    </p>
                    {tied ? (
                      <div className="mt-1.5">
                        <CompactTieStack
                          games={w.games.map((g) => ({
                            gameId: g.gameId,
                            slug: g.slug,
                            title: g.title,
                            coverUrl: g.coverUrl,
                          }))}
                          className="w-full"
                          titleMaxPx={20}
                          titleMinPx={15}
                        />
                      </div>
                    ) : (
                      <Link
                        href={`/games/${first.slug}`}
                        className="group mt-1.5 block"
                        draggable={false}
                      >
                        <CeremonyArt
                          title={first.title}
                          coverUrl={first.coverUrl}
                        />
                        <p className="mt-1.5 line-clamp-2 font-display text-base leading-snug text-ink group-hover:text-accent sm:text-lg">
                          {first.title}
                        </p>
                      </Link>
                    )}
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
 * Compact centered welcome above the GOTY header.
 */
function RevealOpener({
  year,
  communityName,
}: {
  year: number;
  communityName: string;
}) {
  return (
    <section className="relative overflow-hidden px-[var(--gutter)] py-12 sm:py-14">
      <div
        className="pointer-events-none absolute inset-x-0 -top-6 bottom-0"
        aria-hidden
      >
        <div className="reveal-opener-dots absolute inset-0 bg-panel/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-paper" />
      </div>
      <div className="relative mx-auto max-w-xl text-center">
        <h2 className="font-display text-[clamp(2.15rem,8.5vw,2.85rem)] leading-[0.95] tracking-wide text-ink">
          Welcome to the {communityName} community {year} Game of the Year
        </h2>
        <p className="mt-4 font-serif text-base leading-relaxed text-muted sm:text-lg">
          A countdown of the top 10, then the category awards.
        </p>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.22em] text-muted sm:text-[11px]">
          Scroll to reveal
        </p>
        <svg
          className="mx-auto mt-3 block text-accent"
          width="1"
          height="24"
          viewBox="0 0 1 24"
          aria-hidden
        >
          <rect width="1" height="24" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}

export function EditionRevealView({
  year,
  communityName,
  topTen,
  categoryPodiums,
}: {
  year: number;
  communityName: string;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
}) {
  const categories = useEditionCategoryPodiums(categoryPodiums);
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.18em]">
              {year} {communityName} community
            </p>
            <h2 className="mt-1 font-display text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.9] tracking-wide text-ink">
              {year} Game of the Year
            </h2>
            <p className="mt-8 text-center text-muted">
              No Game of the Year scores for this mode.
            </p>
          </section>
        ) : (
          <>
            <RevealOpener year={year} communityName={communityName} />
            <GotyCountdown
              year={year}
              communityName={communityName}
              places={gotyDesc}
            />
          </>
        )}

        {categories.length > 0 ? (
          <CategoriesCountdown
            year={year}
            communityName={communityName}
            awards={categories.map((c) => ({
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
          communityName={communityName}
          topTen={topTen}
          categoryPodiums={categories}
        />
      </div>
    </ReducedMotionProvider>
  );
}
