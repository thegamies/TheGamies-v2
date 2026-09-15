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
      deck="Predict the Video Game Awards and compete on score"
    >
      <p>
        Video Game Awards Pick’em lets you predict the winners of the annual
        Video Game Awards and compete to see how many you get right.
      </p>
      <p>
        Pick’em is separate from The Gamies&apos; Game of the Year rankings and
        awards. Your predictions do not affect Game of the Year results.
      </p>

      <h2>How it works</h2>
      <p>
        Each year includes the show&apos;s categories and nominees. Make your
        picks before the show begins, then follow along as the winners are
        announced.
      </p>
      <p>
        Picks lock when the show starts. Each correct prediction earns 1 point,
        and your score updates as awards are called. Awards that are not
        announced do not count toward your score.
      </p>
      <p>
        You can also look back at previous years to see past nominees, winners,
        and results.{" "}
        <Link href="/the-game-awards">Video Game Awards Pick’em</Link>.
      </p>

      <h2>Communities</h2>
      <p>
        Communities can run their own Pick’em competitions using the same
        nominees and official winners.
      </p>
      <p>
        Make your picks alongside the rest of the community and see who finishes
        with the best score. Community Pick’em results stay within that
        community and do not affect the site-wide competition.
      </p>
    </AboutInfoLayout>
  );
}
