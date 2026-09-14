import type { Metadata } from "next";
import Link from "next/link";
import { AboutInfoLayout } from "@/components/about/AboutInfoLayout";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Library",
  description:
    "The Gamies library is a personal shelf: wishlist, backlog, playing, paused, beat, or dropped.",
  path: "/about/library",
});

export default function AboutLibraryPage() {
  return (
    <AboutInfoLayout title="Library" deck="A shelf, not a yearly ranking">
      <p>
        Library is the shelf next to your year list: what you want, what you
        are playing, and what you finished. It is not a Game of the Year list
        and it is not a custom list.
      </p>

      <h2>Statuses</h2>
      <p>One status per game. The statuses are:</p>
      <ul>
        <li>
          <strong>Wishlist</strong> — marked for later, not a working queue
        </li>
        <li>
          <strong>Backlog</strong> — on the shelf to play
        </li>
        <li>
          <strong>Playing</strong> — in progress
        </li>
        <li>
          <strong>Paused</strong> — stopped for now, still on the shelf
        </li>
        <li>
          <strong>Beat</strong> — finished
        </li>
        <li>
          <strong>Dropped</strong> — stopped without treating it as Beat
        </li>
      </ul>
      <p>
        Beat does not add a game to Game of the Year. A GOTY list does not
        require Beat. Unreleased and off-year titles can sit on the shelf.
      </p>

      <h2>Visibility</h2>
      <p>
        Each row can be public or private. Public rows can show on a public
        profile and in activity. Private rows stay on your shelf. Set a
        status from a game page. Open someone’s{" "}
        <Link href="/people">profile</Link> to see a public library.
      </p>
    </AboutInfoLayout>
  );
}
