import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { TgaBallotForm } from "@/components/tga-pickem/TgaBallotForm";
import { TgaBallotScore } from "@/components/tga-pickem/TgaBallotScore";
import { TgaBoardToggle } from "@/components/tga-pickem/TgaBoardToggle";
import { TgaLeaderboard } from "@/components/tga-pickem/TgaLeaderboard";
import { TgaPublicSheet } from "@/components/tga-pickem/TgaPublicSheet";
import { TgaYearTabs } from "@/components/tga-pickem/TgaYearTabs";
import { TgaCommunityHostsForm } from "../../settings/TgaCommunityHostsForm";
import { getProfileByUsername } from "@/lib/profile/service";
import { getFeaturedEditionForCommunity } from "@/lib/communities/editions";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import {
  getCommunityViewerStanding,
  listCommunityLeaderboard,
} from "@/lib/tga-pickem/scores";
import {
  communityTgaNavVisible,
  getEnabledTgaYear,
  isCommunityTgaOptedIn,
  listTgaBallot,
  maskTgaBallotWinners,
} from "@/lib/tga-pickem/service";
import { listTgaCommunityHostRoster } from "@/lib/tga-pickem/community-hosts";
import { getCommunitySheet } from "@/lib/tga-pickem/sheets";
import { picksAreOpen, tgaStatusLabel } from "@/lib/tga-pickem/status";
import {
  parseTgaBoardMode,
  parseTgaSheetUsername,
  parseTgaYearView,
  tgaYearHref,
} from "@/lib/tga-pickem/year-href";
import { noIndexRobots } from "@/lib/seo/site";
import {
  importSiteTgaSheetAction,
  saveCommunityPicksToSiteAction,
  saveCommunityTgaSheetAction,
} from "../actions";

type Params = Promise<{ slug: string; year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Video Game Awards Pick’em",
  robots: noIndexRobots,
};

export default async function CommunityTgaYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug, year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year)) notFound();
  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect(
      `/auth/sign-in?next=/communities/${encodeURIComponent(slug)}/the-game-awards/${year}`,
    );
  }
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) redirect("/account");
  const community = await getCommunityBySlug(slug, profile.id).catch(() => null);
  if (!community?.viewerRole) notFound();

  const slate = await getEnabledTgaYear(year).catch(() => null);
  const optedIn = await isCommunityTgaOptedIn(community.id, year);
  if (!slate || !optedIn) notFound();

  const sp = await searchParams;
  const view = parseTgaYearView(
    Array.isArray(sp.view) ? sp.view[0] : sp.view,
  );
  const boardMode = parseTgaBoardMode(
    Array.isArray(sp.mode) ? sp.mode[0] : sp.mode,
  );
  const canManage = canManageCommunity(community.viewerRole);
  if (view === "settings" && !canManage) {
    redirect(`/communities/${slug}/the-game-awards/${year}`);
  }
  const sheetUsername = parseTgaSheetUsername(
    Array.isArray(sp.u) ? sp.u[0] : sp.u,
  );
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Number(pageRaw ?? 1);
  const path = `/communities/${slug}/the-game-awards/${year}`;
  const open = picksAreOpen(slate);
  const [featured, tgaNav] = await Promise.all([
    getFeaturedEditionForCommunity(community.id).catch(() => null),
    communityTgaNavVisible(community.id).catch(() => true),
  ]);
  const sheetOwner =
    view === "sheet" && sheetUsername && !open
      ? await getProfileByUsername(sheetUsername)
      : null;
  if (view === "sheet" && !open && !sheetOwner) notFound();
  const [ballot, board, sheet, standing, yearHosts] = await Promise.all([
    view === "ballot" || view === "sheet" ? listTgaBallot(year) : Promise.resolve([]),
    view === "standings"
      ? listCommunityLeaderboard(
          community.id,
          year,
          Number.isInteger(page) ? page : 1,
          { hostsOnly: boardMode === "voices" },
        )
      : Promise.resolve(null),
    view === "ballot"
      ? getCommunitySheet(community.id, profile.id, year)
      : view === "sheet" && sheetOwner
        ? getCommunitySheet(community.id, sheetOwner.id, year)
        : Promise.resolve({ picks: {}, worldPremieresGuess: null }),
    view === "ballot" && !open
      ? getCommunityViewerStanding(community.id, year, profile.id)
      : Promise.resolve(null),
    view === "settings"
      ? listTgaCommunityHostRoster(community.id, year).catch(() => [])
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={
          featured && featured.status !== "draft" ? featured.status : null
        }
        editionYear={
          featured && featured.status !== "draft" ? featured.year : null
        }
        tgaYear={year}
        communityId={community.id}
        tgaEnabled={tgaNav}
        active="tga"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />
      <section className="mt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Video Game Awards Pick’em
        </p>
        <h2 className="mt-2 font-display text-4xl tracking-wide text-ink">
          {year}
        </h2>
        <p className="mt-2 text-sm text-muted">{tgaStatusLabel(slate.status)}</p>
        <TgaYearTabs path={path} view={view} showSettings={canManage} />
        {view === "settings" ? (
          <TgaCommunityHostsForm
            slug={community.slug}
            year={year}
            members={yearHosts}
          />
        ) : view === "standings" && board ? (
          <>
            <TgaBoardToggle path={path} mode={boardMode} />
            <TgaLeaderboard
              rows={board.rows}
              page={board.page}
              totalPages={board.totalPages}
              pageHref={(next) =>
                tgaYearHref(path, {
                  view: "standings",
                  mode: boardMode,
                  page: next,
                })
              }
              sheetHref={
                open
                  ? undefined
                  : (username) => tgaYearHref(path, { view: "sheet", username })
              }
              emptyCopy={
                boardMode === "voices"
                  ? "No Hosts on this board yet."
                  : undefined
              }
            />
          </>
        ) : view === "sheet" && sheetOwner && !open ? (
          <TgaPublicSheet
            displayName={sheetOwner.displayName}
            standingsHref={tgaYearHref(path, { view: "standings" })}
            categories={ballot}
            picks={sheet.picks}
            guess={sheet.worldPremieresGuess}
          />
        ) : (
          <>
            {!open ? (
              <TgaBallotScore standing={standing} />
            ) : null}
            <TgaBallotForm
              categories={
                open ? maskTgaBallotWinners(ballot) : ballot
              }
              initialPicks={sheet.picks}
              initialGuess={sheet.worldPremieresGuess}
              locked={!open}
              onSave={saveCommunityTgaSheetAction.bind(null, slug, year)}
              importLabel="Import from the global sheet"
              onImport={importSiteTgaSheetAction.bind(null, slug, year)}
              onCopyToGlobal={saveCommunityPicksToSiteAction.bind(
                null,
                slug,
                year,
              )}
              globalHref={`/the-game-awards/${year}`}
            />
          </>
        )}
      </section>
    </main>
  );
}
