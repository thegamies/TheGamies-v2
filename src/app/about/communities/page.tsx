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
      deck="Group boards and year-end awards"
    >
      <p>
        A community is a group with its own members. Hosts can turn on live
        rankings from those members’ signed-in lists, run a year-end Event, or
        both. A community board is a separate tally from the site-wide Game of
        the Year.
      </p>

      <h2>Live rankings</h2>
      <p>
        Live rankings add members’ Game of the Year lists the same way the
        site board does: top 10 score, 10 points down to 1. Hosts can pause
        updates. The interior — live rankings, Events, members — stays with
        the group.
      </p>

      <h2>Events</h2>
      <p>
        An Event is a year-end ceremony, not a live ticker. Members and Hosts
        submit hidden ballots. When the Event closes, results freeze as
        Combined, Community, and Hosts. We do not recalculate a published
        ceremony because someone changed a list later.
      </p>
      <p>
        Communities are invite-only unless hosts make them public. Public
        memberships can appear on profiles.{" "}
        <Link href="/communities">Find or start a community</Link>.
      </p>
    </AboutInfoLayout>
  );
}
