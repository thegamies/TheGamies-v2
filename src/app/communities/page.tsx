import type { Metadata } from "next";
import Link from "next/link";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { listCommunities } from "@/lib/communities/service";

export const metadata: Metadata = {
  title: "Communities",
  description: "Groups hosting awards and Game of the Year lists on The Gamies.",
};

export default async function CommunitiesPage() {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  let communities: Awaited<ReturnType<typeof listCommunities>> = [];
  try {
    communities = await listCommunities();
  } catch {
    communities = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Directory</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
          Communities
        </h1>
        {profile ? (
          <Link
            href="/communities/new"
            className="border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Start a community
          </Link>
        ) : user ? (
          <Link
            href="/account"
            className="border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Finish your profile
          </Link>
        ) : (
          <Link
            href="/auth/sign-in?next=/communities/new"
            className="border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Sign in to start one
          </Link>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        Podcasts, crews, and friend groups that gather around Game of the Year.
      </p>

      {communities.length === 0 ? (
        <p className="mt-12 border-t border-line py-10 text-muted">
          No communities yet.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {communities.map((community) => (
            <li key={community.id} className="py-5">
              <Link
                href={`/communities/${community.slug}`}
                className="font-display text-2xl tracking-wide text-ink hover:text-accent"
              >
                {community.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {community.memberCount}{" "}
                {community.memberCount === 1 ? "member" : "members"}
              </p>
              {community.description ? (
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  {community.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
