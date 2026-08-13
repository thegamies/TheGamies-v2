import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { listMembersWithEditionVoiceFlags } from "@/lib/communities/voices";
import { EditionSettings } from "./EditionSettings";
import { LiveLockForm } from "./LiveLockForm";
import { LiveRevealSettings } from "./LiveRevealSettings";
import { LiveSettingsForm } from "./LiveSettingsForm";
import type { EditionVoiceMemberOption } from "./EditionVoicesForm";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Community settings",
  robots: { index: false, follow: false },
};

export default async function CommunitySettingsPage({
  params,
}: {
  params: Params;
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

  let editions: CommunityEditionPublic[] = [];
  try {
    editions = await listEditionsForCommunity(community.id);
  } catch {
    editions = [];
  }
  const featured = pickFeaturedEdition(editions);
  const featuredStatus =
    featured && featured.status !== "draft" ? featured.status : null;

  const voicesByEditionId: Record<string, EditionVoiceMemberOption[]> = {};
  for (const edition of editions) {
    try {
      voicesByEditionId[edition.id] = await listMembersWithEditionVoiceFlags(
        community.id,
        edition.id,
      );
    } catch {
      voicesByEditionId[edition.id] = [];
    }
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
      />

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Live rankings
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Optional public board from current members’ lists. Not an edition
          ceremony.
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
      </section>

      <EditionSettings
        slug={community.slug}
        editions={editions}
        voicesByEditionId={voicesByEditionId}
      />
    </main>
  );
}
