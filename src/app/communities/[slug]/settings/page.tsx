import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CommunitySettingsTabs } from "@/components/communities/CommunitySettingsTabs";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { listEditionBallotSubmitters } from "@/lib/communities/ballots";
import {
  parseCommunitySettingsTab,
  pickSettingsEditionYear,
} from "@/lib/communities/community-settings-href";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { parseEditionYear } from "@/lib/communities/edition-status";
import { canManageCommunity, leaveBlockedReason } from "@/lib/communities/rules";
import {
  getCommunityBySlug,
  listCommunityMemberOptions,
} from "@/lib/communities/service";
import { listMembersWithEditionVoiceFlags } from "@/lib/communities/voices";
import { CommunityHostsForm } from "./CommunityHostsForm";
import { CommunityLeaveForm } from "./CommunityLeaveForm";
import { EditionSettings } from "./EditionSettings";
import type { EditionHostPreviewSubmitter } from "./EditionHostPreview";
import { LiveLockForm } from "./LiveLockForm";
import { LiveRevealSettings } from "./LiveRevealSettings";
import { LiveSettingsForm } from "./LiveSettingsForm";
import type { EditionVoiceMemberOption } from "./EditionVoicesForm";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Community settings",
  robots: { index: false, follow: false },
};

export default async function CommunitySettingsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect(
      `/auth/sign-in?next=/communities/${encodeURIComponent(slug)}/settings`,
    );
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

  const sp = await searchParams;
  const tab = parseCommunitySettingsTab(first(sp.tab));
  const yearParsed = parseEditionYear(first(sp.year));
  const requestedYear = "ok" in yearParsed ? yearParsed.year : null;

  let editions: CommunityEditionPublic[] = [];
  try {
    editions = await listEditionsForCommunity(community.id);
  } catch {
    editions = [];
  }
  const featured = pickFeaturedEdition(editions);
  const featuredStatus =
    featured && featured.status !== "draft" ? featured.status : null;
  const selectedYear = pickSettingsEditionYear(
    editions.map((edition) => edition.year),
    requestedYear,
    featured?.year ?? null,
  );
  const selected =
    selectedYear == null
      ? null
      : (editions.find((edition) => edition.year === selectedYear) ?? null);

  let voices: EditionVoiceMemberOption[] = [];
  let submitters: EditionHostPreviewSubmitter[] = [];
  if (tab === "events" && selected) {
    try {
      voices = await listMembersWithEditionVoiceFlags(
        community.id,
        selected.id,
      );
    } catch {
      voices = [];
    }
    if (selected.status !== "published") {
      try {
        submitters = await listEditionBallotSubmitters(selected.id);
      } catch {
        submitters = [];
      }
    }
  }

  let hostMembers: Awaited<ReturnType<typeof listCommunityMemberOptions>> = [];
  if (tab === "community") {
    try {
      hostMembers = await listCommunityMemberOptions(community.id);
    } catch {
      hostMembers = [];
    }
  }
  const canLeave =
    leaveBlockedReason("admin", community.hostCount) == null;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage
        editionStatus={featuredStatus}
        active="settings"
      />

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Settings
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Live rankings, yearly awards, and community admins.
        </p>
        <CommunitySettingsTabs
          slug={community.slug}
          tab={tab}
          year={selectedYear}
        />

        {tab === "live" ? (
          <>
            <p className="mt-6 max-w-xl text-sm text-muted">
              Optional public board from current members’ lists. Not a yearly
              awards vote.
            </p>
            <LiveSettingsForm
              slug={community.slug}
              enabled={community.liveRankingsEnabled}
            />
            <LiveLockForm
              slug={community.slug}
              locked={community.liveRankingsLocked}
              liveEnabled={community.liveRankingsEnabled}
            />
            <LiveRevealSettings
              slug={community.slug}
              scoresVisibleFrom={
                community.liveScoresVisibleFrom?.toISOString() ?? null
              }
            />
          </>
        ) : tab === "events" ? (
          <EditionSettings
            slug={community.slug}
            editions={editions}
            selectedYear={selectedYear}
            voices={voices}
            submitters={submitters}
          />
        ) : (
          <>
            <p className="mt-6 max-w-xl text-sm text-muted">
              Add other admins, or leave if you are not the last admin.
            </p>
            <CommunityHostsForm
              slug={community.slug}
              members={hostMembers}
              viewerProfileId={profile.id}
              hostCount={community.hostCount}
            />
            <CommunityLeaveForm
              slug={community.slug}
              canLeave={canLeave}
            />
          </>
        )}
      </section>
    </main>
  );
}
