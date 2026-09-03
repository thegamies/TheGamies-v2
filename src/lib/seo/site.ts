import type { Metadata } from "next";
import { ogImagePath } from "./og-path";
import { envAppOrigin } from "./origin-env";

export const SITE_NAME = "The Gamies";

export const SITE_DESCRIPTION =
  "Community Game of the Year awards, Hosts, and personal ranked lists.";

export const noIndexRobots = { index: false, follow: false } as const;

export function appOrigin(): string {
  return envAppOrigin();
}

export function publicPageMetadata(input: {
  title: string;
  description?: string;
  path: string;
  index?: boolean;
  image?: string;
}): Metadata {
  const index = input.index !== false;
  const image = input.image ?? ogImagePath({ kind: "default" });
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    robots: index ? { index: true, follow: true } : noIndexRobots,
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
