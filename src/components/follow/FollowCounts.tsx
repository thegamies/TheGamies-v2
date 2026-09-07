import Link from "next/link";
import { profileHref } from "@/lib/profile/profile-page";

export function FollowCounts({
  username,
  following,
  followers,
}: {
  username: string;
  following: number;
  followers: number;
}) {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-muted">
      <Link
        href={profileHref(username, { tab: "following" })}
        className="hover:text-ink"
      >
        <span className="font-semibold text-ink">{following}</span> following
      </Link>
      <Link
        href={profileHref(username, { tab: "followers" })}
        className="hover:text-ink"
      >
        <span className="font-semibold text-ink">{followers}</span>{" "}
        {followers === 1 ? "follower" : "followers"}
      </Link>
    </p>
  );
}
