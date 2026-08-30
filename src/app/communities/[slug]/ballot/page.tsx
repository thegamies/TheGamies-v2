import { redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

/** Old Ballot URL → unified Events tab. */
export default async function CommunityBallotRedirect({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  redirect(`/communities/${encodeURIComponent(slug)}/edition`);
}
