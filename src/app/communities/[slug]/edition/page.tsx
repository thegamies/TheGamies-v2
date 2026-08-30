import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { resolveCommunityEditionNavYear } from "@/lib/communities/community-primary-nav";
import { getCommunityBySlug } from "@/lib/communities/service";

type Params = Promise<{ slug: string }>;

export default async function CommunityEditionIndexPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  let community;
  try {
    community = await getCommunityBySlug(slug, profile?.id);
  } catch {
    community = null;
  }
  if (!community) {
    redirect("/communities");
  }
  if (!community.viewerRole) {
    redirect(`/communities/${encodeURIComponent(community.slug)}`);
  }

  const year = await resolveCommunityEditionNavYear(community.id).catch(
    () => null,
  );

  if (!year) {
    redirect(`/communities/${encodeURIComponent(community.slug)}`);
  }

  redirect(
    `/communities/${encodeURIComponent(community.slug)}/edition/${year}`,
  );
}
