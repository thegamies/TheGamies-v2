import { describe, expect, it } from "vitest";
import { GOTY_REVEAL_TIED_PARK_Y_VH } from "./edition-reveal-motion";
import {
  CATEGORY_REVEAL_FIT,
  categoryRevealAwardFit,
  categoryRevealSoloPreferredW,
  GOTY_REVEAL_FIT,
  gotyRevealCoverFloor,
  gotyRevealFit,
  gotyRevealPreferredCoverW,
  REVEAL_COVER_ASPECT,
} from "./edition-reveal-fit";

const TALL_GOTY = {
  stageH: 1000,
  preferredCoverW: 220,
  parkedGlyphH: 80,
  tiedH: 60,
} as const;

describe("gotyRevealPreferredCoverW", () => {
  it("matches today’s min(vw, cap) with a 112px floor", () => {
    expect(gotyRevealPreferredCoverW(true, 1280)).toBe(220);
    expect(gotyRevealPreferredCoverW(false, 1280)).toBe(190);
    expect(gotyRevealPreferredCoverW(true, 200)).toBe(GOTY_REVEAL_FIT.preferredMin);
  });
});

describe("gotyRevealFit", () => {
  it("keeps preferred park Y and cover width on a tall stage", () => {
    const fit = gotyRevealFit(TALL_GOTY);
    expect(fit.coverW).toBe(220);
    expect(fit.scale).toBe(1);
    expect(fit.parkY).toBeCloseTo(
      (GOTY_REVEAL_TIED_PARK_Y_VH / 100) * TALL_GOTY.stageH,
      5,
    );
  });

  it("raises the park band on a short stage before shrinking the cover", () => {
    const fit = gotyRevealFit({
      ...TALL_GOTY,
      stageH: 520,
    });
    const preferredY = (GOTY_REVEAL_TIED_PARK_Y_VH / 100) * 520;
    expect(fit.coverW).toBe(220);
    expect(fit.parkY).toBeLessThan(preferredY);
    const parkedHalf = 40;
    const glyphTop = fit.parkY - parkedHalf;
    expect(glyphTop).toBeGreaterThanOrEqual(
      -520 / 2 + GOTY_REVEAL_FIT.topInset - 0.5,
    );
    const coverTop = -(fit.coverW * REVEAL_COVER_ASPECT) / 2;
    expect(fit.parkY + parkedHalf + GOTY_REVEAL_FIT.gap).toBeLessThanOrEqual(
      coverTop + 0.5,
    );
  });

  it("shrinks the cover when raising the park band is not enough", () => {
    const fit = gotyRevealFit({
      ...TALL_GOTY,
      stageH: 480,
    });
    expect(fit.coverW).toBeLessThan(220);
    expect(fit.coverW).toBeGreaterThan(gotyRevealCoverFloor(true));
    const parkedHalf = 40;
    const coverTop = -(fit.coverW * REVEAL_COVER_ASPECT) / 2;
    expect(fit.parkY + parkedHalf + GOTY_REVEAL_FIT.gap).toBeLessThanOrEqual(
      coverTop + 0.5,
    );
  });

  it("hits the cover floor on a very short stage and stays out of the header band", () => {
    const parkedGlyphH = 120;
    const tiedH = 80;
    const fit = gotyRevealFit({
      stageH: 280,
      preferredCoverW: 220,
      parkedGlyphH,
      tiedH,
      coverFloor: GOTY_REVEAL_FIT.coverFloorFeatured,
    });
    expect(fit.coverW).toBe(GOTY_REVEAL_FIT.coverFloorFeatured);
    const parkedHalf = Math.max(parkedGlyphH, tiedH) / 2;
    const glyphTop = fit.parkY - parkedHalf;
    expect(glyphTop).toBeGreaterThanOrEqual(
      -280 / 2 + GOTY_REVEAL_FIT.topInset - 0.5,
    );
  });
});

describe("categoryRevealSoloPreferredW", () => {
  it("uses the CSS caps at desktop and the vw cap on a phone", () => {
    expect(categoryRevealSoloPreferredW(true, 1280)).toBe(
      CATEGORY_REVEAL_FIT.heroCapSm,
    );
    expect(categoryRevealSoloPreferredW(false, 390)).toBeCloseTo(
      390 * CATEGORY_REVEAL_FIT.soloVw,
      5,
    );
  });
});

describe("categoryRevealAwardFit", () => {
  const dense3 = {
    stackRows: 3 as const,
    preferredW: 96,
    showTitles: true,
    hero: false,
    rowGap: CATEGORY_REVEAL_FIT.denseGap,
    titleBlockH: CATEGORY_REVEAL_FIT.mosaicTitleBlock,
    floor: CATEGORY_REVEAL_FIT.mosaicFloor,
  };

  it("keeps preferred mosaic width when the board already fits", () => {
    const fit = categoryRevealAwardFit({
      availableH: 800,
      awardChromeH: 80,
      placeHeadH: 40,
      places: [dense3],
    });
    expect(fit.widths[0]).toBe(96);
    expect(fit.align).toBe("center");
    expect(fit.scale).toBe(1);
  });

  it("leaves bottom inset when shrinking a short mosaic", () => {
    const fit = categoryRevealAwardFit({
      availableH: 500,
      awardChromeH: 80,
      placeHeadH: 40,
      places: [dense3],
    });
    expect(fit.widths[0]).toBeLessThan(96);
    expect(fit.align).toBe("start");

    const coverH = fit.widths[0]! * REVEAL_COVER_ASPECT;
    const mosaic =
      3 * (coverH + dense3.titleBlockH) + 2 * dense3.rowGap;
    const total =
      80 + 40 + CATEGORY_REVEAL_FIT.gridMt + mosaic;
    expect(total).toBeLessThanOrEqual(
      500 - CATEGORY_REVEAL_FIT.bottomPad + 0.5,
    );
  });

  it("keeps a solo hero at preferred width when it fits", () => {
    const fit = categoryRevealAwardFit({
      availableH: 600,
      awardChromeH: 80,
      placeHeadH: 40,
      places: [
        {
          stackRows: 1,
          preferredW: 176,
          showTitles: true,
          hero: true,
          rowGap: 0,
          titleBlockH: CATEGORY_REVEAL_FIT.heroTitleBlock,
          floor: CATEGORY_REVEAL_FIT.heroFloor,
        },
      ],
    });
    expect(fit.widths[0]).toBe(176);
    expect(fit.align).toBe("center");
  });
});
