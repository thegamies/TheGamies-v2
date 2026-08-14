/** GOTY Reveal scrub math — number entrance, tied beat, then per-game dwell. */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

const NUMBER_ENTER = 0.24;
const NUMBER_PARK_AT = 0.3;
const NUMBER_PARK_DUR = 0.18;
const TIED_ENTER_AT = 0.44;
const TIED_UP_AT = 0.56;
const EXIT_UNITS = 0.16;
const GAME_OVERLAP = 0.28;
/** Parked Tied / number share this offset from stage center. */
export const GOTY_REVEAL_TIED_PARK_Y_VH = -24;
/** Parked number inset from the right edge, as a fraction of stage width. */
const NUMBER_PARK_SIDE = 0.12;

function introUnits(tied: boolean): number {
  return tied ? 0.72 : 0.48;
}

function perGameUnits(tied: boolean): number {
  return tied ? 1.2 : 0.72;
}

function gamesSpan(gameCount: number, tied: boolean): number {
  const n = Math.max(1, gameCount);
  const per = perGameUnits(tied);
  return n * per - Math.max(0, n - 1) * GAME_OVERLAP;
}

/** Extra scroll for ties so each cover can land at a calm pace. */
export function gotyRevealRankUnits(gameCount: number): number {
  const n = Math.max(1, gameCount);
  const tied = n > 1;
  return introUnits(tied) + gamesSpan(n, tied) + EXIT_UNITS;
}

function rankU(t: number, rankUnits: number): number {
  return t * Math.max(0.001, rankUnits);
}

/**
 * Local t for a rank group. Overlaps neighbors so one rank exits
 * while the next number enters.
 */
export function gotyRevealLocalT(
  p: number,
  index: number,
  units: readonly number[],
): number {
  const n = units.length;
  if (n === 0) return p;
  const overlap = 0.16;
  const total = units.reduce((a, b) => a + b, 0);
  const span = Math.max(0.001, total - overlap * Math.max(0, n - 1));
  let start = 0;
  for (let i = 0; i < index; i += 1) start += units[i]! - overlap;
  return (p * span - start) / Math.max(0.001, units[index]!);
}

export function gotyRevealNumber(
  t: number,
  rankUnits = 1,
): {
  opacity: number;
  enter: number;
  park: number;
  scale: number;
} {
  const u = rankU(t, rankUnits);
  const enter = easeInOut(clamp(u / NUMBER_ENTER, 0, 1));
  const park = easeInOut(
    clamp((u - NUMBER_PARK_AT) / NUMBER_PARK_DUR, 0, 1),
  );
  const exitStart = Math.max(
    rankUnits - EXIT_UNITS,
    NUMBER_PARK_AT + NUMBER_PARK_DUR,
  );
  const exit = easeInOut(clamp((u - exitStart) / EXIT_UNITS, 0, 1));
  const live = u >= -0.08 && u <= rankUnits + 0.1;
  return {
    opacity: live ? enter * (1 - exit) : 0,
    enter,
    park,
    scale: 0.38 + enter * 0.97 - park * 0.78,
  };
}

/**
 * Pixel shift of the glyph center from the stage center.
 * Parked rest is on the right, inset, on the same row as Tied.
 * Callers should position with top-left + translate3d (no % translate)
 * so Chrome mobile matches Safari.
 */
export function gotyRevealNumberShift(
  motion: { enter: number; park: number; scale: number },
  box: { width: number; height: number },
  frame: {
    width: number;
    height: number;
    topInset: number;
    sideInset: number;
    /** Parked Y from stage center (px). Defaults to −24vh. */
    parkY?: number;
  },
): { x: number; y: number; scale: number } {
  const peakScale = Math.max(0.01, motion.scale);
  const narrow = frame.width < 480;
  const sideFrac = narrow ? 0.06 : NUMBER_PARK_SIDE;
  const side = Math.max(frame.sideInset, frame.width * sideFrac);
  const maxW = Math.max(1, frame.width - side * 2);
  const maxH = Math.max(1, frame.height - frame.topInset - side);
  const fitScale = Math.min(
    peakScale,
    box.width > 0 ? maxW / box.width : peakScale,
    box.height > 0 ? maxH / box.height : peakScale,
  );
  const scale = peakScale + motion.park * (fitScale - peakScale);
  const w = Math.max(1, box.width * scale);
  const h = Math.max(1, box.height * scale);
  const parkedX = frame.width / 2 - side - w / 2;
  const tiedY =
    frame.parkY ?? (GOTY_REVEAL_TIED_PARK_Y_VH / 100) * frame.height;
  let x = (1 - motion.enter) * frame.width * -0.58 + motion.park * parkedX;
  let y = motion.park * tiedY;

  // Keep the scaled glyph inside the visible stage (Chrome mobile can
  // otherwise park wide display numbers past the left edge).
  const halfW = w / 2;
  const halfH = h / 2;
  const minX = -frame.width / 2 + side + halfW;
  const maxX = frame.width / 2 - side - halfW;
  const minY = -frame.height / 2 + frame.topInset + halfH;
  const maxY = frame.height / 2 - side - halfH;
  x = clamp(x, Math.min(minX, maxX), Math.max(minX, maxX));
  y = clamp(y, Math.min(minY, maxY), Math.max(minY, maxY));

  return { x, y, scale };
}

export function gotyRevealTied(
  t: number,
  tied: boolean,
  rankUnits = 1,
  parkYVh = GOTY_REVEAL_TIED_PARK_Y_VH,
): { opacity: number; yVh: number } {
  if (!tied) return { opacity: 0, yVh: 12 };
  const u = rankU(t, rankUnits);
  const enter = easeInOut(clamp((u - TIED_ENTER_AT) / 0.1, 0, 1));
  const up = easeInOut(clamp((u - TIED_UP_AT) / 0.12, 0, 1));
  const exitStart = Math.max(rankUnits - EXIT_UNITS, TIED_UP_AT + 0.12);
  const exit = easeInOut(clamp((u - exitStart) / EXIT_UNITS, 0, 1));
  const live = u >= TIED_ENTER_AT - 0.06 && u <= rankUnits + 0.1;
  return {
    opacity: live ? enter * (1 - exit) : 0,
    yVh: (1 - enter) * 12 + up * parkYVh,
  };
}

/** Per-game local t inside a rank, with overlap so covers hand off. */
export function gotyRevealGameLocal(
  t: number,
  gameIndex: number,
  gameCount: number,
  tied: boolean,
  rankUnits = gotyRevealRankUnits(gameCount),
): number {
  const u = rankU(t, rankUnits);
  const per = perGameUnits(tied);
  const start = introUnits(tied);
  const stride = per - (gameCount > 1 ? GAME_OVERLAP : 0);
  return (u - start - gameIndex * stride) / Math.max(0.001, per);
}

export function gotyRevealGameMotion(gameT: number): {
  opacity: number;
  xVw: number;
} {
  const enter = easeInOut(clamp((gameT - 0.02) / 0.28, 0, 1));
  const exit = easeInOut(clamp((gameT - 0.72) / 0.26, 0, 1));
  const live = gameT >= -0.05 && gameT <= 1.08;
  return {
    opacity: live ? enter * (1 - exit) : 0,
    xVw: (1 - enter) * -32 + exit * 36,
  };
}
