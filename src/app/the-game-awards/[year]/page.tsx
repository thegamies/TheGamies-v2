import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { TGA_STANDINGS_OPEN_COPY } from "@/lib/tga-pickem/labels";
import { publicPageMetadata } from "@/lib/seo/site";
import {
  getSiteViewerStanding,
  listSiteLeaderboard,
} from "@/lib/tga-pickem/scores";
import {
  getEnabledTgaYear,
  listTgaBallot,
  listTgaYears,
  maskTgaBallotWinners,
} from "@/lib/tga-pickem/service";
import { getSiteSheet } from "@/lib/tga-pickem/sheets";
import { picksAreOpen, revealTgaWinners, tgaStatusLabel } from "@/lib/tga-pickem/status";
import {
  parseTgaSheetUsername,
  parseTgaYearView,
  tgaYearHref,
} from "@/lib/tga-pickem/year-href";
import { TgaBallotForm } from "@/components/tga-pickem/TgaBallotForm";
import { TgaBallotScore } from "@/components/tga-pickem/TgaBallotScore";
import { TgaLeaderboard } from "@/components/tga-pickem/TgaLeaderboard";
import { TgaPublicSheet } from "@/components/tga-pickem/TgaPublicSheet";
import { TgaYearTabs } from "@/components/tga-pickem/TgaYearTabs";
import { getProfileByUsername } from "@/lib/profile/service";
import { YearSelect } from "@/components/ui/YearSelect";
import { saveSiteTgaSheetAction } from "../actions";

type Params = Promise<{ year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year } = await params;
  return publicPageMetadata({
    title: `${year} Video Game Awards Pick’em`,
    description: `Call every category in the ${year} Video Game Awards Pick’em and follow the board.`,
    path: `/the-game-awards/${year}`,
  });
}

export default async function TgaYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year)) notFound();
  const slate = await getEnabledTgaYear(year).catch(() => null);
  if (!slate) notFound();

  const sp = await searchParams;
  const view = parseTgaYearView(first(sp.view));
  const sheetUsername = parseTgaSheetUsername(first(sp.u));
  const page = Number(first(sp.page) ?? 1);
  const path = `/the-game-awards/${year}`;
  const open = picksAreOpen(slate);
  const reveal = revealTgaWinners(slate);
  const years = await listTgaYears().then((rows) =>
    rows.filter((row) => row.enabled),
  );
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Video Game Awards Pick’em
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
            {year}
          </h1>
          <p className="mt-2 text-sm text-muted">{tgaStatusLabel(slate.status)}</p>
        </div>
        {years.length > 1 ? (
          <YearSelect
            year={year}
            options={years.map((row) => ({
              year: row.year,
              href: `/the-game-awards/${row.year}`,
            }))}
          />
        ) : null}
      </div>

      <TgaYearTabs path={path} view={view} />

      {view === "standings" ? (
        <TgaStandings
          year={year}
          path={path}
          page={page}
          reveal={reveal}
          sheetHref={
            reveal
              ? (username) => tgaYearHref(path, { view: "sheet", username })
              : undefined
          }
        />
      ) : view === "sheet" && sheetUsername && reveal ? (
        <TgaSiteSheet year={year} path={path} username={sheetUsername} />
      ) : (
        <TgaBallot
          year={year}
          profileId={profile?.id ?? null}
          open={open}
          reveal={reveal}
        />
      )}
    </main>
  );
}

async function TgaBallot({
  year,
  profileId,
  open,
  reveal,
}: {
  year: number;
  profileId: string | null;
  open: boolean;
  reveal: boolean;
}) {
  const [ballot, sheet, standing] = await Promise.all([
    listTgaBallot(year),
    profileId
      ? getSiteSheet(profileId, year)
      : Promise.resolve({ picks: {}, worldPremieresGuess: null }),
    profileId && reveal
      ? getSiteViewerStanding(year, profileId)
      : Promise.resolve(null),
  ]);

  return (
    <section className="mt-2">
      {profileId && reveal ? <TgaBallotScore standing={standing} /> : null}
      <TgaBallotForm
        categories={reveal ? ballot : maskTgaBallotWinners(ballot)}
        initialPicks={sheet.picks}
        initialGuess={sheet.worldPremieresGuess}
        locked={!open}
        signInHref={
          profileId ? null : `/auth/sign-in?next=/the-game-awards/${year}`
        }
        onSave={saveSiteTgaSheetAction.bind(null, year)}
      />
    </section>
  );
}

async function TgaStandings({
  year,
  path,
  page,
  reveal,
  sheetHref,
}: {
  year: number;
  path: string;
  page: number;
  reveal: boolean;
  sheetHref?: (username: string) => string;
}) {
  if (!reveal) {
    return (
      <TgaLeaderboard
        rows={[]}
        page={1}
        totalPages={1}
        pageHref={(next) => tgaYearHref(path, { view: "standings", page: next })}
        emptyCopy={TGA_STANDINGS_OPEN_COPY}
      />
    );
  }
  const board = await listSiteLeaderboard(
    year,
    Number.isInteger(page) ? page : 1,
  );
  return (
    <TgaLeaderboard
      rows={board.rows}
      page={board.page}
      totalPages={board.totalPages}
      pageHref={(next) => tgaYearHref(path, { view: "standings", page: next })}
      sheetHref={sheetHref}
    />
  );
}

async function TgaSiteSheet({
  year,
  path,
  username,
}: {
  year: number;
  path: string;
  username: string;
}) {
  const owner = await getProfileByUsername(username);
  if (!owner) notFound();
  const [ballot, sheet] = await Promise.all([
    listTgaBallot(year),
    getSiteSheet(owner.id, year),
  ]);
  return (
    <TgaPublicSheet
      displayName={owner.displayName}
      username={owner.username}
      avatarUrl={owner.avatarUrl}
      standingsHref={tgaYearHref(path, { view: "standings" })}
      categories={ballot}
      picks={sheet.picks}
      guess={sheet.worldPremieresGuess}
    />
  );
}
