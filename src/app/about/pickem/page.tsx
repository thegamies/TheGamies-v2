import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Video Game Awards Pick’em",
  description:
    "How Video Game Awards Pick’em works on The Gamies — predictions for the external show, not this site’s Game of the Year.",
  path: "/about/pickem",
});

export default function AboutPickemPage() {
  return (
    <AboutInfoLayout
      title="Pick’em"
      deck="Predictions for the external awards show"
    >
      <p>
        Video Game Awards Pick’em is a prediction sheet for the external
        awards show. It is not this site’s Game of the Year, and it does not
        feed the GOTY board.
      </p>

      <h2>How a year works</h2>
      <p>
        Each year has a slate of categories and nominees. Game categories
        link to titles in the catalog. Other categories (performances,
        esports, and similar) use names on the sheet. Picks lock when the
        show starts. Scoring follows official winners as they are called: 1
        point per correct called award. Uncalled awards do not score.
      </p>
      <p>
        Open the current or past years at{" "}
        <Link href="/the-game-awards">Video Game Awards Pick’em</Link>.
      </p>

      <h2>Communities</h2>
      <p>
        A community can run its own sheets against the same official
        winners. Those sheets stay inside the community. They do not replace
        the site-wide game.
      </p>
    </AboutInfoLayout>
  );
}
