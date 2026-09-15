import Link from "next/link";
import { HomeChapterSplit } from "@/components/home/HomeChapterFigure";

const outlinedLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent";

const chapterClass =
  "max-w-2xl space-y-3 text-[15px] leading-relaxed text-muted";

export function HomeWhatIs() {
  return (
    <section className="py-5 sm:py-6" aria-labelledby="what-is-the-gamies">
      <div className={chapterClass}>
        <h2
          id="what-is-the-gamies"
          className="m-0 font-display text-3xl tracking-wide text-ink sm:text-4xl"
        >
          What is The Gamies?
        </h2>
        <p>
          The Gamies is a place to rank Game of the Year and read the standings
          those lists produce. Keep a yearly list, pick category awards, and
          join a community to run its own board or year-end awards.
        </p>
      </div>
    </section>
  );
}

export function HomeGotyIntro({
  resultsHref = "/game-of-the-year",
  resultsCategoriesHref = "/game-of-the-year",
}: {
  resultsHref?: string;
  resultsCategoriesHref?: string;
}) {
  return (
    <section className="py-5 sm:py-6" aria-labelledby="home-goty">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2
          id="home-goty"
          className="m-0 font-display text-3xl tracking-wide text-ink sm:text-4xl"
        >
          Game of the Year
        </h2>
        <Link href="/game-of-the-year" className={outlinedLinkClass}>
          All years
        </Link>
      </div>
      <div className="home-chapter-rows mt-3 space-y-8 sm:mt-4 sm:space-y-10">
        <HomeChapterSplit
          title="Create a list"
          stillSrc="/home/list-ranked.jpg"
          stillAlt="A Game of the Year list in Ranked grid view"
          imageSide="left"
          actions={[
            { href: "/create/goty", label: "Create a list", accent: true },
            { href: "/create/goty?view=categories", label: "Make picks" },
          ]}
        >
          <p>
            Rank up to 100 games from the year and build your personal Game of
            the Year list. Your Top 10 earn points, with 10 for #1 and 1 for
            #10.
          </p>
          <p>
            Then pick your winners for each award, from Best Indie and Best
            Soundtrack to the rest of the year&apos;s categories.
          </p>
        </HomeChapterSplit>
        <HomeChapterSplit
          title="View results"
          stillSrc="/home/standings-goty.jpg"
          stillAlt="Game of the Year standings with ranked covers"
          imageSide="right"
          actions={[
            { href: resultsHref, label: "Game of the Year" },
            { href: resultsCategoriesHref, label: "Categories" },
            { href: "/rankings", label: "How rankings work" },
          ]}
        >
          <p>
            Every list helps shape the live Game of the Year rankings. See where
            each game stands and how many points it has earned.
          </p>
          <p>
            Category winners appear alongside the year&apos;s overall rankings.
            Rankings go public once enough lists have been submitted, while vote
            counts stay hidden until the year is revealed.
          </p>
        </HomeChapterSplit>
      </div>
    </section>
  );
}

export function HomeCommunitiesIntro() {
  return (
    <section className="py-5 sm:py-6" aria-labelledby="home-communities">
      <h2
        id="home-communities"
        className="m-0 font-display text-3xl tracking-wide text-ink sm:text-4xl"
      >
        Communities
      </h2>
      <div className="home-chapter-rows mt-3 sm:mt-4">
        <HomeChapterSplit
          title="Run a community"
          stillSrc="/home/community-overview.jpg"
          stillAlt="A community overview with events and Pick’em"
          imageSide="left"
          actions={[{ href: "/communities", label: "Communities", accent: true }]}
        >
          <p>
            Create a community for your friends, group, or audience and run your
            own Game of the Year rankings and awards.
          </p>
          <p>
            Keep rankings live throughout the year, or run a year-end Event with
            hidden ballots, Hosts, and final results.
          </p>
          <p>
            Communities can be private and invite-only or open to everyone.
            Rankings, Events, and members all live in one place.
          </p>
        </HomeChapterSplit>
      </div>
    </section>
  );
}
