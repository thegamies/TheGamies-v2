export type PromoBannerKind = "tga" | "event";

export type PromoBannerCopy = {
  kicker?: string;
  accent: string;
  rest: string;
  status: string;
  live: boolean;
  cta: string;
};
