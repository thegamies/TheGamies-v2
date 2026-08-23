import { NextRequest } from "next/server";
import { getGameBySlug } from "@/lib/catalog";
import { getCommunityBySlug } from "@/lib/communities/service";
import { isCommunityPublic } from "@/lib/communities/schema";
import { getShareListByUsernameSlug, getShareListItems } from "@/lib/lists/service";
import { getProfileByUsername } from "@/lib/profile/service";
import type { OgCardCover } from "@/lib/seo/og-card";
import { renderOgImage } from "@/lib/seo/og-image";
import { shouldIndexProfile } from "@/lib/seo/sitemap-plan";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

async function defaultCard() {
  return renderOgImage({
    title: SITE_NAME,
    subtitle: SITE_DESCRIPTION,
  });
}

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") ?? "default";
  let response: Awaited<ReturnType<typeof renderOgImage>>;
  try {
    response = await renderForKind(kind, request.nextUrl.searchParams);
  } catch {
    response = await defaultCard();
  }
  response.headers.set("Cache-Control", "public, max-age=3600");
  return response;
}

async function renderForKind(kind: string, params: URLSearchParams) {
  if (kind === "game") {
    const slug = params.get("slug") ?? "";
    const game = await getGameBySlug(slug);
    if (!game) return defaultCard();
    return renderOgImage({
      kicker: "Game",
      title: game.title,
      subtitle: game.year ? String(game.year) : undefined,
      covers: game.coverUrl ? [{ url: game.coverUrl }] : [],
    });
  }

  if (kind === "profile") {
    const username = params.get("username") ?? "";
    const profile = await getProfileByUsername(username);
    if (!profile || !shouldIndexProfile(profile)) return defaultCard();
    return renderOgImage({
      kicker: "Profile",
      title: profile.displayName,
      subtitle: `@${profile.username}`,
    });
  }

  if (kind === "list") {
    const username = params.get("username") ?? "";
    const slug = params.get("slug") ?? "";
    const [profile, data] = await Promise.all([
      getProfileByUsername(username),
      getShareListByUsernameSlug(username, slug, { includeItems: false }),
    ]);
    if (!profile || !shouldIndexProfile(profile) || !data) return defaultCard();
    const items = await getShareListItems(data.list.id, { limit: 4 });
    const covers: OgCardCover[] = items
      .filter((item) => item.coverUrl)
      .map((item) => ({ url: item.coverUrl as string, rank: item.rank }));
    return renderOgImage({
      kicker: data.list.year ? `${data.list.year} list` : "List",
      title: data.list.title,
      subtitle: data.owner?.displayName,
      covers,
    });
  }

  if (kind === "goty") {
    const year = Number(params.get("year"));
    if (!Number.isFinite(year)) return defaultCard();
    return renderOgImage({
      kicker: "Standings",
      title: `${Math.floor(year)} Game of the Year`,
      subtitle: "Live rankings on The Gamies",
    });
  }

  if (kind === "community") {
    const slug = params.get("slug") ?? "";
    const community = await getCommunityBySlug(slug);
    if (!community || !isCommunityPublic(community.visibility)) {
      return defaultCard();
    }
    return renderOgImage({
      kicker: "Community",
      title: community.name,
      subtitle: community.description || undefined,
    });
  }

  return defaultCard();
}
