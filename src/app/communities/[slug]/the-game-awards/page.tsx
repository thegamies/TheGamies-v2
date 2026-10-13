import { redirect } from "next/navigation";
import { getCommunityTgaPromoYear } from "@/lib/tga-pickem/service";
import { canBrowseCommunityBoards } from "@/lib/communities/schema";
import { getCommunityBySlug } from "@/lib/communities/service";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";

type Params = Promise<{ slug: string }>;

export default async function CommunityTgaIndexPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const community = await getCommunityBySlug(slug, profile?.id).catch(
    () => null,
  );
  if (!community) redirect(`/communities/${slug}`);
  if (
    !canBrowseCommunityBoards(
      community.visibility,
      community.joinsClosed,
      community.viewerRole,
    )
  ) {
    redirect(`/communities/${encodeURIComponent(community.slug)}`);
  }
  const promo = await getCommunityTgaPromoYear(community.id).catch(() => null);
  if (promo) {
    redirect(`/communities/${slug}/the-game-awards/${promo.year}`);
  }
  redirect(`/communities/${slug}`);
}
