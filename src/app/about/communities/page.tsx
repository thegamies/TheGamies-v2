import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Communities",
  description:
    "How communities on The Gamies run live rankings and year-end Events.",
  path: "/about/communities",
});

export default function AboutCommunitiesPage() {
  return (
    <AboutInfoLayout
      title="Communities"
      deck="Friends, creators, and groups running their own awards"
    >
      <p>
        Communities are groups where friends, creators, podcasts, or other
        gaming communities can run their own Game of the Year rankings and
        awards.
      </p>
      <p>
        Each community has its own members and results, separate from the
        site-wide Game of the Year rankings. Hosts can run live rankings
        throughout the year, hold a year-end Event, or do both.
      </p>

      <h2>Live rankings</h2>
      <p>
        Live rankings combine members&apos; Game of the Year lists into a
        community-wide board. Scoring works the same way as the main Game of
        the Year rankings: 10 points for #1, 9 for #2, continuing down to 1
        point for #10.
      </p>
      <p>
        As members update their lists, the community rankings update with them.
        Hosts can pause live rankings whenever they want.
      </p>

      <h2>Events</h2>
      <p>
        Events are designed for year-end awards and voting rather than an
        always-changing leaderboard.
      </p>
      <p>
        Members and Hosts submit hidden ballots during the Event. Once voting
        closes, the results are revealed and frozen so they represent the
        community&apos;s picks at that moment.
      </p>
      <p>
        Results can be viewed three ways: <strong>Combined</strong> for everyone,{" "}
        <strong>Community</strong> for member ballots, and <strong>Hosts</strong>{" "}
        for Host ballots.
      </p>
      <p>
        Communities can be private and invite-only or open to everyone.
        Rankings, Events, voting, and members all stay within the community.{" "}
        <Link href="/communities">Find or start a community</Link>.
      </p>
    </AboutInfoLayout>
  );
}
