import { redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

/** Old Results URL → unified Edition tab. */
export default async function CommunityResultsRedirect({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  redirect(`/communities/${encodeURIComponent(slug)}/edition`);
}
