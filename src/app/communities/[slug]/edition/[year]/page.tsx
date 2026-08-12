import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityNav } from "@/components/communities/CommunityNav";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  getEditionByCommunityYear,
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import {
  editionStatusLabel,
  showEditionNav,
  type EditionStatus,
} from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";

type Params = Promise<{ slug: string; year: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Edition" };
    if (!Number.isFinite(year)) {
      return { title: `${community.name} edition` };
    }
    return {
      title: `${community.name} ${Math.floor(year)} edition`,
      description: `${community.name} Game of the Year edition.`,
    };
  } catch {
    return { title: "Edition" };
  }
}

function editionBodyCopy(status: EditionStatus): string {
  switch (status) {
    case "scheduled":
      return "This edition is coming soon. Voting has not opened yet.";
    case "open":
      return "Voting is open. Ballot entry is coming soon.";
    case "closed":
      return "Voting has closed. Final standings are not published yet.";
    case "published":
      return "Results are published. Full Combined, Community, and Voices boards are coming soon.";
    case "draft":
      return "This edition is not public yet.";
  }
}

export default async function CommunityEditionYearPage({
  params,
}: {
  params: Params;
}) {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) notFound();
  const y = Math.floor(year);

  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  let community;
  try {
    community = await getCommunityBySlug(slug, profile?.id);
  } catch {
    community = null;
  }
  if (!community) notFound();

  let edition: CommunityEditionPublic | null = null;
  let publicEditions: CommunityEditionPublic[] = [];
  try {
    const editions = await listEditionsForCommunity(community.id);
    publicEditions = editions.filter((e) => showEditionNav(e.status));
    edition = await getEditionByCommunityYear(community.id, y);
  } catch {
    edition = null;
  }

  if (!edition || !showEditionNav(edition.status)) notFound();

  const canManage = canManageCommunity(community.viewerRole);
  const featured = pickFeaturedEdition(publicEditions);
  const navStatus = featured?.status ?? edition.status;
  const yearOptions = publicEditions.map((e) => e.year).sort((a, b) => b - a);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {community.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {edition.year} edition · {editionStatusLabel(edition.status)}
      </p>

      <CommunityNav
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={navStatus}
        active="edition"
      />

      {yearOptions.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Edition years">
          {yearOptions.map((opt) => (
            <Link
              key={opt}
              href={`/communities/${community.slug}/edition/${opt}`}
              className={`border px-3 py-1.5 text-sm tracking-wide transition-colors ${
                opt === edition.year
                  ? "border-accent text-accent"
                  : "border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {opt}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Game of the Year
        </h2>
        <p className="mt-4 max-w-xl text-muted">
          {editionBodyCopy(edition.status)}
        </p>
      </section>
    </main>
  );
}
