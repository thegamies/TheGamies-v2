import Link from "next/link";
import { isAnonymizedVoter } from "@/lib/profile/delete-account";

export function VoterProfileHandle({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  if (isAnonymizedVoter({ username, displayName })) {
    return null;
  }
  return (
    <Link
      href={`/u/${username}`}
      className="hover:text-accent hover:underline"
    >
      @{username}
    </Link>
  );
}
