import { Suspense } from "react";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CommunityPrivateView } from "@/components/communities/CommunityPrivateView";
import { RouteStatus } from "@/components/ui/RouteStatus";
import { getCommunityMasthead } from "@/lib/communities/community-chrome";

type Params = Promise<{ slug: string }>;

export default async function CommunitySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { slug } = await params;
  const masthead = await getCommunityMasthead(slug);

  if (!masthead) {
    return children;
  }

  const { community, canManage, editionStatus, invitePath } = masthead;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      {community.viewerRole ? (
        <>
          <CommunityHeader
            name={community.name}
            slug={community.slug}
            liveEnabled={community.liveRankingsEnabled}
            canManage={canManage}
            editionStatus={editionStatus}
            invitePath={invitePath}
          />
          <Suspense fallback={<RouteStatus status="loading" inset />}>
            {children}
          </Suspense>
        </>
      ) : (
        <CommunityPrivateView name={community.name} />
      )}
    </main>
  );
}
