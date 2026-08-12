import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipActions } from "@/app/communities/[slug]/MembershipActions";
import { EditionBallotEditor } from "@/components/communities/EditionBallotEditor";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import { EditionResultsView } from "@/components/communities/EditionResultsView";
import { CommunityNav } from "@/components/communities/CommunityNav";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  canSubmitEditionBallot,
  getEditionBallotForProfile,
} from "@/lib/communities/ballots";
import {
  ensurePublishedEditionResults,
  getEditionCategoryResults,
  getEditionGotyPage,
  getEditionResultsMeta,
  getEditionVotersPage,
  parseEditionResultMode,
} from "@/lib/communities/edition-results";
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
import { listActiveAwardCategories } from "@/lib/live-aggregate/categories";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";

type Params = Promise<{ slug: string; year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

function editionIntroCopy(status: EditionStatus): string {
  switch (status) {
    case "scheduled":
      return "This edition is coming soon. Voting has not opened yet.";
    case "open":
      return "Voting is open. Rank your Game of the Year and make category picks.";
    case "closed":
      return "Voting has closed. Final standings are not published yet.";
    case "published":
      return "Final results for this edition.";
    case "draft":
      return "This edition is not public yet.";
  }
}

export default async function CommunityEditionYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) notFound();
  const y = Math.floor(year);

  const sp = await searchParams;
  const mode = parseEditionResultMode(first(sp.mode));
  const pageRaw = Number(first(sp.page) ?? "1");
  const votersPageRaw = Number(first(sp.votersPage) ?? "1");
  const standingsPageNum =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const votersPageNum =
    Number.isFinite(votersPageRaw) && votersPageRaw >= 1
      ? Math.floor(votersPageRaw)
      : 1;
  const votersQ = (first(sp.q) ?? "").trim();

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

  const isMember = canSubmitEditionBallot(community.viewerRole);
  const signInHref = `/auth/sign-in?next=/communities/${encodeURIComponent(community.slug)}/edition/${y}`;

  let ballot = null;
  if (profile && isMember) {
    try {
      ballot = await getEditionBallotForProfile(edition.id, profile.id);
    } catch {
      ballot = null;
    }
  }

  const awardCategories =
    edition.status === "open" || ballot
      ? await listActiveAwardCategories().catch(() => [])
      : [];

  let resultsBundle: {
    meta: NonNullable<Awaited<ReturnType<typeof getEditionResultsMeta>>>;
    topTen: Awaited<ReturnType<typeof getEditionGotyPage>>["rows"];
    standingsPage: Awaited<ReturnType<typeof getEditionGotyPage>>;
    categories: Awaited<ReturnType<typeof getEditionCategoryResults>>;
    voters: Awaited<ReturnType<typeof getEditionVotersPage>> & { q: string };
  } | null = null;

  if (edition.status === "published") {
    try {
      await ensurePublishedEditionResults(community.id, edition.year);
      const meta = await getEditionResultsMeta(edition.id);
      if (meta) {
        const topTenPage = await getEditionGotyPage(edition.id, mode, {
          page: 1,
          pageSize: 10,
        });
        const fullPage =
          standingsPageNum === 1
            ? await getEditionGotyPage(edition.id, mode, {
                page: 1,
                pageSize: STANDINGS_PAGE_SIZE,
              })
            : await getEditionGotyPage(edition.id, mode, {
                page: standingsPageNum,
                pageSize: STANDINGS_PAGE_SIZE,
              });
        const categories = await getEditionCategoryResults(edition.id, mode);
        const voters = await getEditionVotersPage(edition.id, {
          page: votersPageNum,
          pageSize: STANDINGS_PAGE_SIZE,
          q: votersQ,
        });
        resultsBundle = {
          meta,
          topTen: topTenPage.rows,
          standingsPage: fullPage,
          categories,
          voters: { ...voters, q: votersQ },
        };
      }
    } catch {
      resultsBundle = null;
    }
  }

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

      {edition.status === "published" && resultsBundle ? (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-3xl tracking-wide text-ink">
            Results
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            {editionIntroCopy(edition.status)}
          </p>
          <EditionResultsView
            slug={community.slug}
            year={edition.year}
            mode={mode}
            meta={resultsBundle.meta}
            topTen={resultsBundle.topTen}
            standingsPage={resultsBundle.standingsPage}
            categories={resultsBundle.categories}
            voters={resultsBundle.voters}
            yourProfileId={profile?.id ?? null}
          />
          {profile && isMember ? (
            <div className="mt-14 border-t border-line pt-8">
              <h3 className="font-display text-2xl tracking-wide text-ink">
                Your ballot
              </h3>
              <EditionBallotReadonly
                items={ballot?.items ?? []}
                categoryVotes={ballot?.categoryVotes ?? []}
                categories={awardCategories}
                emptyMessage="You did not submit a ballot for this edition."
              />
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-3xl tracking-wide text-ink">
            Game of the Year
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            {editionIntroCopy(edition.status)}
          </p>

          {edition.status === "scheduled" ? null : edition.status ===
            "open" ? (
            !user ? (
              <p className="mt-6 max-w-xl text-muted">
                <Link href={signInHref} className="text-accent hover:underline">
                  Sign in
                </Link>{" "}
                and join this community to submit a ballot.
              </p>
            ) : !profile ? (
              <p className="mt-6 max-w-xl text-muted">
                <Link href="/account" className="text-accent hover:underline">
                  Finish your profile
                </Link>{" "}
                to join this community and vote.
              </p>
            ) : !isMember ? (
              <div className="mt-6 max-w-xl">
                <p className="text-muted">
                  Join this community to submit a ballot while voting is open.
                </p>
                <MembershipActions
                  slug={community.slug}
                  isMember={false}
                  canLeave={false}
                />
              </div>
            ) : (
              <EditionBallotEditor
                slug={community.slug}
                year={edition.year}
                initialItems={ballot?.items ?? []}
                initialCategoryVotes={ballot?.categoryVotes ?? []}
                awardCategories={awardCategories}
              />
            )
          ) : (
            !user || !profile || !isMember ? (
              <p className="mt-6 max-w-xl text-muted">
                Voting has closed for this edition.
              </p>
            ) : (
              <EditionBallotReadonly
                items={ballot?.items ?? []}
                categoryVotes={ballot?.categoryVotes ?? []}
                categories={awardCategories}
                emptyMessage="You did not submit a ballot for this edition."
              />
            )
          )}
        </section>
      )}
    </main>
  );
}
