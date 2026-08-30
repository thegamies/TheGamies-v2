import {
  listEditionsForCommunity,
  pickFeaturedEdition,
} from "@/lib/communities/editions";
import { showEditionNav } from "@/lib/communities/edition-status";

export type CommunityNavActive =
  | "overview"
  | "live"
  | "edition"
  | "tga"
  | "members"
  | "settings";

export function communityLiveNavYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

export function communityPrimaryHref(
  slug: string,
  key: CommunityNavActive,
  years: {
    edition?: number | null;
    live?: number | null;
    tga?: number | null;
  } = {},
): string {
  const base = `/communities/${encodeURIComponent(slug)}`;
  switch (key) {
    case "overview":
      return base;
    case "live":
      return years.live != null ? `${base}/live/${years.live}` : `${base}/live`;
    case "edition":
      return years.edition != null
        ? `${base}/edition/${years.edition}`
        : `${base}/edition`;
    case "tga":
      return years.tga != null
        ? `${base}/the-game-awards/${years.tga}`
        : `${base}/the-game-awards`;
    case "members":
      return `${base}/members`;
    case "settings":
      return `${base}/settings`;
  }
}

/** Same year the `/edition` index redirects to. */
export async function resolveCommunityEditionNavYear(
  communityId: string,
): Promise<number | null> {
  const editions = await listEditionsForCommunity(communityId);
  const publicEditions = editions.filter((edition) =>
    showEditionNav(edition.status),
  );
  return (
    pickFeaturedEdition(publicEditions)?.year ??
    publicEditions[0]?.year ??
    null
  );
}
