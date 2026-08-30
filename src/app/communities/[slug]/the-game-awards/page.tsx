import { redirect } from "next/navigation";
import {
  communityTgaNavVisible,
  resolveTgaLandingYear,
} from "@/lib/tga-pickem/service";
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
  const visible = await communityTgaNavVisible(community.id).catch(() => false);
  if (!visible) redirect(`/communities/${slug}`);
  const year = await resolveTgaLandingYear().catch(() => null);
  if (year) {
    redirect(`/communities/${slug}/the-game-awards/${year}`);
  }
  redirect(`/communities/${slug}`);
}
