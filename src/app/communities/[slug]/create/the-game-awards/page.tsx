import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CreateTgaForm } from "@/components/tga-pickem/CreateTgaForm";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  communityCreateTgaHref,
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
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import {
  communityTgaCreateYears,
  communityTgaSettingsEmptyReason,
  pickCommunityTgaSettingsYear,
} from "@/lib/tga-pickem/promo";
import {
  communityTgaNavVisible,
  listCommunityTgaYears,
  listTgaYears,
} from "@/lib/tga-pickem/service";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: `Create ${TGA_PUBLIC_LABEL}`,
  robots: { index: false, follow: false },
};

export default async function CreateCommunityTgaPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const createPath = communityCreateTgaHref(slug);
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

  let featuredStatus: EditionStatus | null = null;
  try {
    const editions = await listEditionsForCommunity(community.id);
    const featured = pickFeaturedEdition(editions);
    featuredStatus =
      featured && featured.status !== "draft" ? featured.status : null;
  } catch {
    featuredStatus = null;
  }

  const [siteYears, existing] = await Promise.all([
    listTgaYears().catch(() => []),
    listCommunityTgaYears(community.id).catch(() => []),
  ]);
  const available = communityTgaCreateYears(
    siteYears,
    existing.map((row) => row.year),
  );
  const defaultYear = pickCommunityTgaSettingsYear(
    siteYears,
    existing.map((row) => row.year),
  )?.year;
  const emptyReason = communityTgaSettingsEmptyReason(siteYears);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage
        editionStatus={featuredStatus}
        communityId={community.id}
        tgaEnabled={await communityTgaNavVisible(community.id).catch(() => false)}
        active="settings"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Create {TGA_PUBLIC_LABEL}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Same official slate and winners as the site. Members keep a separate
          sheet for this community.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href={communitySettingsHref(community.slug, { tab: "tga" })}
            className="text-ink underline-offset-4 hover:underline"
          >
            Back to {TGA_PUBLIC_LABEL}
          </Link>
        </p>
        {defaultYear == null || available.length === 0 ? (
          <p className="mt-6 max-w-xl text-sm text-muted">
            {emptyReason === "locked"
              ? "Picks have locked for the current show. You can create it again when the next year is on."
              : `${TGA_PUBLIC_LABEL} is not on for the site yet.`}
          </p>
        ) : (
          <CreateTgaForm
            slug={community.slug}
            defaultYear={defaultYear}
            availableYears={available.map((row) => row.year)}
          />
        )}
      </section>
    </main>
  );
}
