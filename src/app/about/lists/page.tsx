import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Lists",
  description:
    "Game of the Year lists, category picks, and custom lists on The Gamies.",
  path: "/about/lists",
});

export default function AboutListsPage() {
  return (
    <AboutInfoLayout title="Lists" deck="Yearly rankings and named lists">
      <p>
        There are two kinds of lists. A Game of the Year list is a ranked year.
        A custom list is a named ranking you title yourself.
      </p>

      <h2>Game of the Year</h2>
      <p>
        Rank up to 100 games for a year. The top 10 score: 10 points for 1st,
        down to 1 point for 10th. Games 11–100 stay on the list; they do not
        move the site board.
      </p>
      <p>
        On the same list, pick one game per award — Best Indie, Best
        Soundtrack, and the rest of the slate. You can start without an
        account and save the list to a profile when you are ready.
      </p>
      <p>
        Signed-in lists add up to the live{" "}
        <Link href="/game-of-the-year">Game of the Year</Link> board.{" "}
        <Link href="/rankings">How rankings work</Link> covers scoring and when
        ranks go public.{" "}
        <Link href="/create/goty">Create a Game of the Year list</Link>.
      </p>

      <h2>Custom lists</h2>
      <p>
        A custom list is a ranked pile with your own title. It is not tied to
        a year and does not feed the site Game of the Year board. Share the
        URL when you want it public.{" "}
        <Link href="/create/custom">Create a custom list</Link>.
      </p>
    </AboutInfoLayout>
  );
}
