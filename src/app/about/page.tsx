import type { Metadata } from "next";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { IGDB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <SiteInfoLayout title="About" deck="The Gamies">
      <p>
        The Gamies is a community-driven Game of the Year site. Create ranked
        lists, join communities, and see how votes add up into shared rankings.
      </p>
      <p>
        Browse games, keep personal lists, and follow yearly awards as they
        unfold.
      </p>
      <h2>Game data</h2>
      <p>
        Game metadata on The Gamies (titles, covers, platforms, and related
        details) comes from the community-driven database{" "}
        <a href={IGDB_URL} target="_blank" rel="noopener noreferrer">
          IGDB
        </a>
        .
      </p>
      <p>
        If you spot a missing game, wrong cover, or other data issue, please
        submit a correction on IGDB. Approved changes are reflected here after
        our catalog updates.
      </p>
    </SiteInfoLayout>
  );
}
