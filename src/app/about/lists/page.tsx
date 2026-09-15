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
    <AboutInfoLayout
      title="Lists"
      deck="Yearly Game of the Year lists and custom lists"
    >
      <p>
        The Gamies has two kinds of lists: yearly Game of the Year lists and
        custom lists you can build around anything.
      </p>

      <h2>Game of the Year</h2>
      <p>
        Rank up to 100 games from a year. Your Top 10 determine the points that
        go toward the overall Game of the Year rankings. Your #1 earns 10
        points, #2 earns 9, continuing down to 1 point for #10.
      </p>
      <p>
        Games ranked 11 through 100 still appear on your personal list, but they
        do not contribute points to the overall rankings.
      </p>
      <p>
        You can also choose a winner for each award category, including Best
        Indie, Best Soundtrack, Best Combat, and the rest of the year&apos;s
        categories.
      </p>
      <p>
        Lists contribute to the live{" "}
        <Link href="/game-of-the-year">Game of the Year</Link> board, where
        games are ranked by the points they earn across everyone&apos;s lists.
        Rankings become public once enough lists have been submitted, while vote
        counts stay hidden until the year is revealed.{" "}
        <Link href="/rankings">How rankings work</Link>
        {" · "}
        <Link href="/create/goty">Create a Game of the Year list</Link>.
      </p>

      <h2>Custom lists</h2>
      <p>
        Custom lists let you rank games around any topic you want. Give your
        list a name, add your games, put them in order, and share it with
        others.
      </p>
      <p>
        Unlike Game of the Year lists, custom lists are not tied to a specific
        year and do not contribute to the overall Game of the Year rankings.{" "}
        <Link href="/create/custom">Create a custom list</Link>.
      </p>
    </AboutInfoLayout>
  );
}
