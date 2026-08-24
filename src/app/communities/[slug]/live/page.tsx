import { redirect } from "next/navigation";
import { communityLiveNavYear } from "@/lib/communities/community-primary-nav";

type Params = Promise<{ slug: string }>;

export default async function CommunityLiveIndexPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  redirect(
    `/communities/${encodeURIComponent(slug)}/live/${communityLiveNavYear()}`,
  );
}
