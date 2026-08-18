import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EditionEventTabBar } from "@/components/communities/EditionEventTabBar";
import { EditionSectionHeader } from "@/components/communities/EditionSectionHeader";
import { RouteStatus } from "@/components/ui/RouteStatus";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  canSubmitEditionBallot,
  countEditionSubmittedBallots,
  getEditionBallotForProfile,
} from "@/lib/communities/ballots";
import {
  getCommunityMasthead,
  getRequestEditionsForCommunity,
} from "@/lib/communities/community-chrome";
import {
  getEditionByCommunityYear,
} from "@/lib/communities/editions";
import { showEditionNav } from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";

type Params = Promise<{ slug: string; year: string }>;

function TabBarFallback() {
  return (
    <div className="mt-6 h-9 border-b border-line" aria-hidden />
  );
}

export default async function CommunityEditionYearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) notFound();
  const y = Math.floor(year);

  const masthead = await getCommunityMasthead(slug);
  if (!masthead?.community.viewerRole) notFound();

  const { community } = masthead;
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  const editions = await getRequestEditionsForCommunity(community.id);
  const publicEditions = editions.filter((e) => showEditionNav(e.status));
  const edition = await getEditionByCommunityYear(community.id, y).catch(
    () => null,
  );
  if (!edition || !showEditionNav(edition.status)) notFound();

  const canManage = canManageCommunity(community.viewerRole);
  const isMember = canSubmitEditionBallot(community.viewerRole);
  const yearOptions = publicEditions.map((e) => e.year).sort((a, b) => b - a);

  let ballotCount: number | null = null;
  if (
    edition.status === "open" ||
    edition.status === "closed" ||
    edition.status === "published"
  ) {
    try {
      ballotCount = await countEditionSubmittedBallots(edition.id);
    } catch {
      ballotCount = 0;
    }
  }

  let hasYourBallot = false;
  if (profile && isMember) {
    try {
      const ballot = await getEditionBallotForProfile(edition.id, profile.id);
      hasYourBallot = ballot != null;
    } catch {
      hasYourBallot = false;
    }
  }

  const showLiveVoters =
    edition.status === "open" || edition.status === "closed";

  return (
    <section className="mt-8">
      <EditionSectionHeader
        status={edition.status}
        slug={community.slug}
        year={edition.year}
        years={yearOptions}
        opensAt={edition.opensAt}
        closesAt={edition.closesAt}
        publishesAt={edition.publishesAt}
        ballotCount={ballotCount}
      />
      <Suspense fallback={<TabBarFallback />}>
        <EditionEventTabBar
          slug={community.slug}
          year={edition.year}
          published={edition.status === "published"}
          canManage={canManage}
          hasYourBallot={hasYourBallot}
          includeVoters={showLiveVoters}
          includeRevealShow={canManage && edition.status === "closed"}
          ballotLabel={
            edition.status === "scheduled" ? "On the ballot" : "Ballot"
          }
        />
      </Suspense>
      <Suspense fallback={<RouteStatus status="loading" inset />}>
        {children}
      </Suspense>
    </section>
  );
}
