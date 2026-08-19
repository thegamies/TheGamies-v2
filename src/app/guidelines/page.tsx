import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Community Guidelines",
};

export default function GuidelinesPage() {
  return (
    <SiteInfoLayout
      title="Community Guidelines"
      deck="How we treat lists, communities, and ceremonies"
    >
      <p>
        The Gamies is for ranking games, keeping personal lists, and running
        community awards. These guidelines sit alongside our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>Be decent</h2>
      <p>
        Do not harass, threaten, impersonate, or abuse other people. Do not
        post hate or content meant to intimidate. Treat Hosts, members, and
        visitors with the same respect you would in a public awards room.
      </p>

      <h2>Keep rankings honest</h2>
      <p>
        Lists and ballots should reflect a real person&apos;s picks. Do not
        create fake accounts, spam, or use bots or other automated tricks to
        move rankings, votes, or community features.
      </p>

      <h2>Public by choice</h2>
      <p>
        Profiles and published lists are public. Do not share someone else&apos;s
        hidden ballot, unpublished picks, or private community material. If you
        would not put it on a poster, do not post it here as if it were yours to
        reveal.
      </p>

      <h2>Communities and Hosts</h2>
      <p>
        Communities are invite-only spaces. Hosts may add or remove members and
        run events within these guidelines and the Terms. Do not raid, scrape,
        or try to force your way into a community you were not invited to.
      </p>

      <h2>What we may do</h2>
      <p>
        We may remove content, restrict features, suspend accounts, or
        permanently ban anyone who breaks these guidelines or the{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>How to report</h2>
      <p>
        If something crosses a line, email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> or use{" "}
        <Link href="/contact">Contact</Link>. Include a link and a short
        description of what happened.
      </p>
    </SiteInfoLayout>
  );
}
