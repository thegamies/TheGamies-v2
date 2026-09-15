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
        Profiles are where you can share your Game of the Year lists, custom
        lists, Library, and activity with others.
      </p>
      <p>
        You choose whether your profile is public or private. Private profiles
        do not appear in search or to other people.
      </p>

      <h2>Following</h2>
      <p>
        Follow people to keep up with what they are playing, ranking, and adding
        to their lists. Following someone is separate from joining a community
        and does not require their approval.
      </p>
      <p>
        Your <Link href="/following">Following</Link> feed brings together
        public activity from the people you follow, including their lists and
        Library updates. When you are signed out,{" "}
        <Link href="/people">People</Link> is username search.
      </p>

      <h2>Trending</h2>
      <p>
        Trending highlights what people across The Gamies are playing, ranking,
        and adding to their Libraries.
      </p>
      <p>
        You can also see what&apos;s trending specifically among the people you
        follow. Private Library activity is never included.
      </p>
    </AboutInfoLayout>
  );
}
