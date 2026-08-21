import type { Metadata } from "next";
import Link from "next/link";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { ProfilePager } from "@/components/profile/ProfilePager";
import { parseProfilePage } from "@/lib/profile/profile-page";
import { listMembershipCommunitiesPage } from "@/lib/communities/service";
import { communitiesIndexHref } from "@/lib/communities/invite-code";

export const metadata: Metadata = {
  title: "Communities",
  description: "Private groups hosting awards and Game of the Year lists.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const pageRaw = parseProfilePage(first(sp.page));
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  const memberships = profile
    ? await listMembershipCommunitiesPage(profile.id, pageRaw).catch(
        () => null,
      )
    : null;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
          Communities
        </h1>
        {profile ? (
          <Link href="/communities/new">
            <Button type="button" variant="accent-bordered">
              Start a community
            </Button>
          </Link>
        ) : user ? (
          <Link
            href="/account"
            className="border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Finish your profile
          </Link>
        ) : (
          <Link href="/auth/sign-in?next=/communities/new">
            <Button type="button" variant="accent-bordered">
              Sign in to start one
            </Button>
          </Link>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        Private crews for Game of the Year lists and awards. Join with an
        invite.
      </p>

      <h2 className="mt-12 font-display text-3xl tracking-wide text-ink">
        My Communities
      </h2>

      {!user ? (
        <p className="mt-6 border-t border-line py-10 text-muted">
          Sign in to see the communities you belong to.
        </p>
      ) : !profile ? (
        <p className="mt-6 border-t border-line py-10 text-muted">
          Finish your profile to see the communities you belong to.
        </p>
      ) : !memberships || memberships.communities.length === 0 ? (
        <p className="mt-6 border-t border-line py-10 text-muted">
          You are not in a community yet.
        </p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {memberships.communities.map((community) => (
              <li key={community.id} className="py-5">
                <Link
                  href={`/communities/${community.slug}`}
                  className="flex items-center gap-4 font-display text-2xl tracking-wide text-ink hover:text-accent"
                >
                  {community.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={community.avatarUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full border border-line object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-panel text-lg"
                      aria-hidden
                    >
                      {community.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {community.name}
                </Link>
                <p className="mt-1 pl-16 text-sm text-muted">
                  {community.memberCount}{" "}
                  {community.memberCount === 1 ? "member" : "members"}
                </p>
                {community.description ? (
                  <p className="mt-2 max-w-2xl pl-16 text-sm text-muted">
                    {community.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <ProfilePager
            from={(memberships.page - 1) * memberships.pageSize + 1}
            to={Math.min(
              memberships.page * memberships.pageSize,
              memberships.total,
            )}
            total={memberships.total}
            page={memberships.page}
            totalPages={memberships.totalPages}
            prevHref={
              memberships.page > 1
                ? communitiesIndexHref(memberships.page - 1)
                : null
            }
            nextHref={
              memberships.page < memberships.totalPages
                ? communitiesIndexHref(memberships.page + 1)
                : null
            }
            label="My Communities pages"
          />
        </>
      )}
    </main>
  );
}
