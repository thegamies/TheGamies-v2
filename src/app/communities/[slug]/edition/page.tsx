import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { showEditionNav } from "@/lib/communities/edition-status";
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

  let editions: CommunityEditionPublic[] = [];
  try {
    editions = await listEditionsForCommunity(community.id);
  } catch {
    editions = [];
  }
  const publicEditions = editions.filter((e) => showEditionNav(e.status));
  const featured = pickFeaturedEdition(publicEditions);
  const year = featured?.year ?? publicEditions[0]?.year;

  if (!year) {
    redirect(`/communities/${encodeURIComponent(community.slug)}`);
  }

  redirect(
    `/communities/${encodeURIComponent(community.slug)}/edition/${year}`,
  );
}
