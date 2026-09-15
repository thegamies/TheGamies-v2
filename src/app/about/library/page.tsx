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
    <AboutInfoLayout title="Library" deck="Track games without ranking them">
      <p>
        Your Library is where you keep track of the games you want to play, are
        playing, or have finished. It is separate from your Game of the Year
        and custom lists, so games can stay organized without needing to be
        ranked.
      </p>

      <h2>Statuses</h2>
      <p>Each game can have one Library status:</p>
      <ul>
        <li>
          <strong>Wishlist</strong> for games you want to remember for later
        </li>
        <li>
          <strong>Backlog</strong> for games you plan to play
        </li>
        <li>
          <strong>Playing</strong> for games currently in progress
        </li>
        <li>
          <strong>Paused</strong> for games you have put aside for now
        </li>
        <li>
          <strong>Beat</strong> for games you have finished
        </li>
        <li>
          <strong>Dropped</strong> for games you stopped playing
        </li>
      </ul>
      <p>
        Your Library and Game of the Year lists are independent. Beating a game
        does not automatically add it to your Game of the Year list, and you
        do not need to beat a game before ranking it.
      </p>
      <p>You can also add unreleased games and games from any year to your Library.</p>

      <h2>Visibility</h2>
      <p>
        Each game in your Library can be public or private. Public games can
        appear on your profile and in activity, while private games are visible
        only to you.
      </p>
      <p>
        You can update your Library from any game page and browse other
        people&apos;s public Libraries from their{" "}
        <Link href="/people">profiles</Link>.
      </p>
    </AboutInfoLayout>
  );
}
