import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { ABOUT_SECTION_LINKS } from "@/lib/about/sections";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "About",
  description:
    "The Gamies is a place to rank Game of the Year, read standings, and run community awards.",
  path: "/about",
});

const SECTION_BLURBS: Record<(typeof ABOUT_SECTION_LINKS)[number]["href"], string> =
  {
    "/about": "What the site is, and where catalog data comes from.",
    "/about/lists":
      "Game of the Year lists, category picks, and custom lists.",
    "/about/communities":
      "Live rankings, year-end Events, and group Pick’em.",
    "/about/library":
      "Wishlist, backlog, playing, and the rest of the shelf.",
    "/about/people": "Profiles, follow, and public activity.",
    "/about/pickem":
      "Video Game Awards Pick’em — predictions for the external show.",
  };

export default function AboutPage() {
  return (
    <AboutInfoLayout title="About" deck="Personal lists and community awards">
      <p>
        The Gamies is a place to rank Game of the Year and read the standings
        those lists produce. Keep a yearly list, pick category awards, keep a
        library, follow people, and join a community to run its own board or
        year-end awards.
      </p>

      <h2>Features</h2>
      <ul>
        {ABOUT_SECTION_LINKS.filter((link) => link.href !== "/about").map(
          (link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
              {" — "}
              {SECTION_BLURBS[link.href]}
            </li>
          ),
        )}
        <li>
          <Link href="/rankings">How rankings work</Link>
          {" — "}
          Scoring, when ranks go public, and how lists, Events, and Pick’em
          differ.
        </li>
      </ul>

      <h2>Catalog</h2>
      <p>
        Game pages exist so you can find a title and put it on a list or a
        shelf. Covers, dates, and related metadata come from IGDB. If a cover
        is wrong or a game is missing, fix it there; approved changes show up
        here after the catalog updates.
      </p>

      <p>
        Questions go to <Link href="/contact">Contact</Link>. Conduct lives in
        the <Link href="/guidelines">Community Guidelines</Link>.
      </p>
    </AboutInfoLayout>
  );
}
