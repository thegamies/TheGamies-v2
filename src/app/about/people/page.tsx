import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "People",
  description:
    "Public profiles, follow, and activity on The Gamies.",
  path: "/about/people",
});

export default function AboutPeoplePage() {
  return (
    <AboutInfoLayout title="People" deck="Profiles, follow, and activity">
      <p>
        A public profile can show Game of the Year lists, custom lists, and a
        public library. You choose whether a profile is public. Private
        profiles are not listed for other people.
      </p>

      <h2>Follow</h2>
      <p>
        Sign in to follow a public profile. Follow is one-to-one: you see
        that person’s public list and library activity without joining a
        community. It is not membership, and it is not a request to approve.
      </p>
      <p>
        When you are signed in, <Link href="/following">Following</Link> is
        the feed of people you follow. When you are signed out,{" "}
        <Link href="/people">People</Link> is username search.
      </p>

      <h2>Trending</h2>
      <p>
        Site trending on the homepage is public activity across the site.
        Following also has a trending view limited to people you follow.
        Private library rows do not count.
      </p>
    </AboutInfoLayout>
  );
}
