import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "How rankings work",
  description:
    "How The Gamies scores Game of the Year lists, when ranks go public, and how lists, Events, and Pick’em differ.",
  path: "/rankings",
});

export default function RankingsPage() {
  return (
    <SiteInfoLayout
      title="How rankings work"
      deck="Lists first, then the board"
    >
      <p>
        Public numbers on The Gamies start as personal lists. Rank up to 100
        games for a year. The top 10 score: 10 points for 1st, down to 1
        point for 10th. Signed-in lists add up to a live Game of the Year
        board. IGDB does not vote.
      </p>

      <h2>Personal Game of the Year lists</h2>
      <p>
        Games 11–100 stay on your list; they do not move the site board. You
        can also pick one game per award (Best Indie, Best Soundtrack, and
        the rest of the slate). Start without an account and save the list
        to a profile when you are ready.{" "}
        <Link href="/create/goty">Create a Game of the Year list</Link>. More
        on list types: <Link href="/about/lists">Lists</Link>.
      </p>

      <h2>Site standings</h2>
      <p>
        The site Game of the Year board adds top-10 scores from signed-in
        lists for that year. Place is shared when points match. Ranks are
        public once enough people have listed the year. Points, voter
        counts, and the list-position chart stay hidden until that year’s
        totals are revealed.
      </p>
      <p>
        Open the{" "}
        <Link href="/game-of-the-year">year-by-year standings</Link>.
      </p>

      <h2>Communities and Events</h2>
      <p>
        A community can run live rankings from members’ lists — same scoring
        idea, different roster. An Event is a year-end ceremony: hidden
        ballots, then frozen Combined, Community, and Hosts results. We do
        not recalculate a published ceremony because someone changed a list
        later. <Link href="/about/communities">Communities</Link>.
      </p>

      <h2>Video Game Awards Pick’em</h2>
      <p>
        Pick’em is a prediction sheet for the external awards show, not this
        site’s Game of the Year. Picks lock when the show starts. It does
        not feed the GOTY board.{" "}
        <Link href="/about/pickem">How Pick’em works</Link>.
      </p>
    </SiteInfoLayout>
  );
}
