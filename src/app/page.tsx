import { HomeBigPictureBanner } from "@/components/home/HomeBigPictureBanner";
import { HomeCoverStrip } from "@/components/home/HomeCoverStrip";
import {
  HomeCommunitiesIntro,
  HomeGotyIntro,
  HomeWhatIs,
} from "@/components/home/HomePitch";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import { loadHomePublic } from "@/lib/home/load-home-public";
import { gotyCreatorCta, type GotyCreatorCta } from "@/lib/lists/existing-goty";
import { loadGotyCreatorCtas } from "@/lib/lists/load-goty-creator-cta";
import { SiteAds } from "@/components/ads/AdsLayout";
import { adsenseAccountMetadata } from "@/lib/ads/adsense";
import { gamesBrowseHref, trendingHref } from "@/lib/activity/paths";
import { getRequestSessionUser } from "@/lib/auth/session";
import { publicPageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import { PromoBanner } from "@/components/promo/PromoBanner";
import { tgaPromoCopy } from "@/lib/tga-pickem/promo";

export const metadata = {
  ...publicPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  ...adsenseAccountMetadata(),
  title: { absolute: SITE_NAME },
};

export default async function HomePage() {
  const listYear = new Date().getUTCFullYear();
  const [sessionUser, home] = await Promise.all([
    getRequestSessionUser(),
    loadHomePublic(),
  ]);
  const signedIn = Boolean(sessionUser?.id);
  const creatorCtas = home.standingsReady
    ? await loadGotyCreatorCtas([...home.years, listYear]).catch(
        () => new Map<number, GotyCreatorCta>(),
      )
    : new Map<number, GotyCreatorCta>();
  const sections = home.sections.map((section) => ({
    ...section,
    creatorCta:
      creatorCtas.get(section.year) ?? gotyCreatorCta(section.year, null),
  }));
  const { minVisible, bigPictureGames, trendingGames, upcomingGames } = home;
  const tgaBand = home.tga;

  const featuredYear = sections[0] ?? null;
  const laterYears = sections.slice(1);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] pb-6 pt-0 sm:pb-8">
      <SiteAds />
      <HomeBigPictureBanner games={bigPictureGames} />
      {featuredYear ? (
        <section className="pt-5 sm:pt-6 pb-4 sm:pb-6">
          <YearTopFiveSections
            sections={[featuredYear]}
            minVisible={minVisible}
            showHeader={false}
            gotyHeading
            empty={null}
          />
        </section>
      ) : null}
      {signedIn ? null : <HomeWhatIs />}
      {signedIn ? null : (
        <HomeGotyIntro
          resultsHref={featuredYear?.yearHref ?? "/game-of-the-year"}
          resultsCategoriesHref={
            featuredYear
              ? `${featuredYear.yearHref}/categories`
              : "/game-of-the-year"
          }
        />
      )}
      {signedIn ? null : <HomeCommunitiesIntro />}
      {tgaBand ? (
        <section className="border-b border-line py-6 sm:py-8">
          <PromoBanner
            kind="tga"
            year={tgaBand.year}
            href={`/the-game-awards/${tgaBand.year}`}
            {...tgaPromoCopy(tgaBand)}
          />
        </section>
      ) : null}

      <section className="pt-2 sm:pt-4">
        <HomeCoverStrip
          title="Trending"
          moreHref={trendingHref()}
          games={trendingGames}
          empty="No trending games yet."
          label="Trending games"
        />
        <HomeCoverStrip
          title="Upcoming"
          moreHref={gamesBrowseHref({ releaseStatus: "upcoming" })}
          games={upcomingGames}
          empty="No upcoming titles in the catalog yet."
          label="Upcoming games"
        />
      </section>

      {laterYears.length > 0 ? (
        <section className="pt-8 sm:pt-10">
          <YearTopFiveSections
            sections={laterYears}
            minVisible={minVisible}
            showHeader={false}
            gotyHeading
            empty={null}
          />
        </section>
      ) : null}
    </main>
  );
}
