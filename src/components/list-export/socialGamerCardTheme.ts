/** Reference width from the design prototype (360px card). */
export const SOCIAL_GAMER_CARD_REF_WIDTH = 360;

export interface SocialGamerCardTheme {
  innerBorder: string;
  outerBorder: string;
  badgeDark: string;
  accent: string;
  /** Glow tint for rank-tab box-shadow (e.g. gold haze). */
  glow: string;
}

export const SOCIAL_GAMER_CARD_THEMES: Record<number, SocialGamerCardTheme> = {
  1: {
    innerBorder: "#f2c94c",
    outerBorder: "#b98522",
    badgeDark: "#0b0b09",
    accent: "#ffffff",
    glow: "rgba(255,190,50,0.35)",
  },
  2: {
    innerBorder: "#e8e8f0",
    outerBorder: "#8a8a98",
    badgeDark: "#0b0b09",
    accent: "#ffffff",
    glow: "rgba(200,200,220,0.35)",
  },
  3: {
    innerBorder: "#e8a86a",
    outerBorder: "#a05a20",
    badgeDark: "#0b0b09",
    accent: "#ffffff",
    glow: "rgba(255,120,40,0.35)",
  },
};

export function themeForRank(rank: number): SocialGamerCardTheme {
  return SOCIAL_GAMER_CARD_THEMES[rank] ?? SOCIAL_GAMER_CARD_THEMES[3];
}

export function scaleCardPx(cardWidth: number, refPx: number): number {
  return Math.round(refPx * (cardWidth / SOCIAL_GAMER_CARD_REF_WIDTH));
}

/** Downward nudge for rank digit in the tab (ref 360px card). */
export function rankDigitNudgeY(cardWidth: number): number {
  return scaleCardPx(cardWidth, 4);
}

/** Cover corner radius at full bleed (ref 360px card — matches outer frame radius). */
export const COVER_CLIP_RADIUS_REF = 14;

export function cardOuterRadius(cardWidth: number): number {
  return scaleCardPx(cardWidth, COVER_CLIP_RADIUS_REF);
}

export function coverClipBoxStyle(cardWidth: number): {
  position: "absolute";
  top: number;
  right: number;
  bottom: number;
  left: number;
  borderRadius: number;
  overflow: "hidden";
  zIndex: number;
} {
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: cardOuterRadius(cardWidth),
    overflow: "hidden",
    zIndex: 0,
  };
}
