import type { Metadata } from "next";
import { ogImagePath } from "./og-path";
import { envAppOrigin } from "./origin-env";

export const SITE_NAME = "The Gamies";

export const SITE_DESCRIPTION =
  "Independent Game of the Year lists, live standings, and community awards.";

export const noIndexRobots = { index: false, follow: false } as const;

/** Thin catalog game pages: stay out of the index, still pass PageRank to lists. */
export const noIndexFollowRobots = { index: false, follow: true } as const;

export function appOrigin(): string {
  return envAppOrigin();
}

export function publicPageMetadata(input: {
  title: string;
  description?: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  image?: string;
}): Metadata {
  const index = input.index !== false;
  const follow = input.follow ?? index;
  const image = input.image ?? ogImagePath({ kind: "default" });
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    robots: index
      ? { index: true, follow }
      : follow
        ? noIndexFollowRobots
        : noIndexRobots,
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
