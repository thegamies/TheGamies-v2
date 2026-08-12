import { redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

export default async function CommunityLiveIndexPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  redirect(
    `/communities/${encodeURIComponent(slug)}/live/${new Date().getUTCFullYear()}`,
  );
}
