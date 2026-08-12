import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipActions } from "@/app/communities/[slug]/MembershipActions";
import { EditionBallotEditor } from "@/components/communities/EditionBallotEditor";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import { EditionResultsView } from "@/components/communities/EditionResultsView";
import { CommunityNav } from "@/components/communities/CommunityNav";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  canSubmitEditionBallot,
  getEditionBallotForProfile,
  listEditionBallotSubmitters,
} from "@/lib/communities/ballots";
import {
  ensurePublishedEditionResults,
  getEditionBallotMatrix,
  getEditionCategoryPickStrips,
  getEditionCategoryResults,
  getEditionGotyPage,
  getEditionResultsMeta,
  getEditionVotersPage,
  getEditionVoterDetailByUsername,
  listEditionCategoryMeta,
  parseEditionResultMode,
  parseEditionResultsView,
  type EditionBallotMatrix,
  type EditionCategoryMeta,
  type EditionCategoryPickCard,
  type EditionCategoryStandingBlock,
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
  const votersPageRaw = Number(first(sp.votersPage) ?? "1");
  const votersPageNum =
    Number.isFinite(votersPageRaw) && votersPageRaw >= 1
      ? Math.floor(votersPageRaw)
      : 1;
  const votersQ = (first(sp.q) ?? "").trim();
  const voterUsername = (first(sp.voter) ?? "").trim();

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
    edition.status === "open" ||
    (profile && isMember) ||
    (edition.status === "published" && voterUsername.length > 0)
      ? await listActiveAwardCategories().catch(() => [])
      : [];

  const requestedView = parseEditionResultsView(first(sp.view));
  const view =
    requestedView === "ballot" &&
    !(profile && isMember) &&
    !voterUsername
      ? "overview"
      : requestedView;

  let submitters: Awaited<ReturnType<typeof listEditionBallotSubmitters>> = [];
  if (canManage && edition.status !== "published") {
    try {
      submitters = await listEditionBallotSubmitters(edition.id);
    } catch {
      submitters = [];
    }
  }

  let resultsBundle: {
    meta: NonNullable<Awaited<ReturnType<typeof getEditionResultsMeta>>>;
    topTen: Awaited<ReturnType<typeof getEditionGotyPage>>["rows"];
    categoryPodiums: EditionCategoryStandingBlock[];
    categoryPickStrips: Record<string, EditionCategoryPickCard[]>;
    categoryMeta: EditionCategoryMeta[];
    voters: Awaited<ReturnType<typeof getEditionVotersPage>> & { q: string };
    matrix: EditionBallotMatrix;
    publicBallot: {
      voter: {
        profileId: string;
        displayName: string;
        username: string;
        isVoice: boolean;
      };
      items: Array<{
        gameId: string;
        title: string;
        coverUrl: string | null;
        rank: number;
      }>;
      categoryVotes: Array<{
        categoryId: string;
        title: string;
        coverUrl: string | null;
      }>;
      categories: Array<{ id: string; label: string }>;
    } | null;
  } | null = null;

  if (edition.status === "published") {
    try {
      await ensurePublishedEditionResults(community.id, edition.year);
      const meta = await getEditionResultsMeta(edition.id);
      if (meta) {
        const emptyVoters = {
          page: 1,
          pageSize: STANDINGS_PAGE_SIZE,
          total: 0,
          totalPages: 1,
          rows: [] as Awaited<
            ReturnType<typeof getEditionVotersPage>
          >["rows"],
          q: "",
        };
        const emptyMatrix: EditionBallotMatrix = {
          showYou: false,
          hasGames: false,
          voiceColumns: [],
          rows: [],
        };

        if (view === "standings") {
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryPickStrips: {},
            categoryMeta: [],
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "categories") {
          const categoryMeta = await listEditionCategoryMeta(edition.id, mode);
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryPickStrips: {},
            categoryMeta,
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "voters") {
          const voters = await getEditionVotersPage(edition.id, {
            page: votersPageNum,
            pageSize: STANDINGS_PAGE_SIZE,
            q: votersQ,
            voicesOnly: mode === "voices",
          });
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryPickStrips: {},
            categoryMeta: [],
            voters: { ...voters, q: votersQ },
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "ballot") {
          let publicBallot: {
            voter: {
              profileId: string;
              displayName: string;
              username: string;
              isVoice: boolean;
            };
            items: Array<{
              gameId: string;
              title: string;
              coverUrl: string | null;
              rank: number;
            }>;
            categoryVotes: Array<{
              categoryId: string;
              title: string;
              coverUrl: string | null;
            }>;
            categories: Array<{ id: string; label: string }>;
          } | null = null;
          if (voterUsername) {
            const detail = await getEditionVoterDetailByUsername(
              edition.id,
              voterUsername,
            );
            if (detail) {
              publicBallot = {
                voter: detail.voter,
                items: detail.ranks.map((r) => ({
                  gameId: r.gameId,
                  title: r.title,
                  coverUrl: r.coverUrl,
                  rank: r.rank,
                })),
                categoryVotes: detail.categoryPicks.map((p) => ({
                  categoryId: p.categoryId,
                  title: p.title,
                  coverUrl: p.coverUrl,
                })),
                categories: awardCategories,
              };
            }
          }
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryPickStrips: {},
            categoryMeta: [],
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot,
          };
        } else {
          const topTenPage = await getEditionGotyPage(edition.id, mode, {
            page: 1,
            pageSize: 10,
          });
          const categoryPodiums = await getEditionCategoryResults(
            edition.id,
            mode,
            { maxPlace: 3 },
          );
          const categoryPickStrips = await getEditionCategoryPickStrips(
            edition.id,
            { viewerProfileId: profile?.id ?? null },
          );
          const matrix = await getEditionBallotMatrix(edition.id, {
            viewerProfileId: profile?.id ?? null,
          });
          resultsBundle = {
            meta,
            topTen: topTenPage.rows,
            categoryPodiums,
            categoryPickStrips,
            categoryMeta: [],
            voters: emptyVoters,
            matrix,
            publicBallot: null,
          };
        }
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

      {edition.status === "published" && resultsBundle ? (
        <section className="mt-10 border-t border-line pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-3xl tracking-wide text-ink">
              Results
            </h2>
            <EditionYearSelect
              slug={community.slug}
              year={edition.year}
              years={yearOptions}
            />
          </div>
          <p className="mt-4 max-w-xl text-muted">
            {editionIntroCopy(edition.status)}
          </p>
          <EditionResultsView
            slug={community.slug}
            year={edition.year}
            mode={mode}
            view={view}
            meta={resultsBundle.meta}
            topTen={resultsBundle.topTen}
            categoryPodiums={resultsBundle.categoryPodiums}
            categoryPickStrips={resultsBundle.categoryPickStrips}
            categoryMeta={resultsBundle.categoryMeta}
            voters={resultsBundle.voters}
            matrix={resultsBundle.matrix}
            yourProfileId={profile?.id ?? null}
            yourBallot={
              profile && isMember
                ? {
                    items: ballot?.items ?? [],
                    categoryVotes: ballot?.categoryVotes ?? [],
                    categories: awardCategories,
                  }
                : null
            }
            publicBallot={resultsBundle.publicBallot}
            voterUsername={voterUsername || null}
          />
        </section>
      ) : (
        <section className="mt-10 border-t border-line pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-3xl tracking-wide text-ink">
              Game of the Year
            </h2>
            <EditionYearSelect
              slug={community.slug}
              year={edition.year}
              years={yearOptions}
            />
          </div>
          <p className="mt-4 max-w-xl text-muted">
            {editionIntroCopy(edition.status)}
          </p>

          {canManage && submitters.length > 0 ? (
            <div className="mt-8 border border-line p-4">
              <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
                Host preview
              </p>
              <p className="mt-2 text-sm text-muted">
                {submitters.length} submitted ballot
                {submitters.length === 1 ? "" : "s"} (hidden from the public
                until results publish).
              </p>
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
                {submitters.map((s) => (
                  <li key={s.profileId} className="flex justify-between gap-3">
                    <span className="text-ink">
                      {s.displayName}
                      {s.isVoice ? " · Voice" : ""}
                    </span>
                    <span className="text-muted">{s.itemCount} games</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : canManage && edition.status !== "published" ? (
            <p className="mt-6 text-sm text-muted">
              No ballots submitted yet. Seed from Ops → Community seed, or vote
              while open.
            </p>
          ) : null}

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
