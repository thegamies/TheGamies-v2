import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CreateEventForm } from "@/components/communities/CreateEventForm";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  communityCreateEventHref,
  communitySettingsHref,
} from "@/lib/communities/community-settings-href";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
} from "@/lib/communities/editions";
import type { EditionStatus } from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { listActiveAwardCategories } from "@/lib/live-aggregate/categories";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Create event",
  robots: { index: false, follow: false },
};

export default async function CreateCommunityEventPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const createPath = communityCreateEventHref(slug);
  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(createPath)}`);
  }
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) redirect("/account");

  let community;
  try {
    community = await getCommunityBySlug(slug, profile.id);
  } catch {
    community = null;
  }
  if (!community) notFound();
  if (!canManageCommunity(community.viewerRole)) {
    redirect(`/communities/${community.slug}`);
  }

  let existingYears: number[] = [];
  let featuredStatus: EditionStatus | null = null;
  try {
    const editions = await listEditionsForCommunity(community.id);
    existingYears = editions.map((edition) => edition.year);
    const featured = pickFeaturedEdition(editions);
    featuredStatus =
      featured && featured.status !== "draft" ? featured.status : null;
  } catch {
    existingYears = [];
  }

  let siteCategoryCatalog: AwardCategoryOption[] = [];
  try {
    const siteCats = await listActiveAwardCategories();
    siteCategoryCatalog = siteCats.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      sortOrder: c.sortOrder,
      categoryGroup: c.categoryGroup,
      eligibility: c.eligibility,
      allowEditions: c.allowEditions,
    }));
  } catch {
    siteCategoryCatalog = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage
        editionStatus={featuredStatus}
        active="settings"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Create event
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Year, schedule, categories, and tie numbering. You can change these
          after you create the event.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href={communitySettingsHref(community.slug, { tab: "events" })}
            className="text-ink underline-offset-4 hover:underline"
          >
            Back to events
          </Link>
        </p>
        <CreateEventForm
          slug={community.slug}
          defaultYear={new Date().getUTCFullYear()}
          existingYears={existingYears}
          siteCategoryCatalog={siteCategoryCatalog}
        />
      </section>
    </main>
  );
}
