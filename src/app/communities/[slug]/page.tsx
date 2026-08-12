import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { leaveBlockedReason } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { MembershipActions } from "./MembershipActions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Community" };
    return {
      title: community.name,
      description:
        community.description || `${community.name} on The Gamies`,
    };
  } catch {
    return { title: "Community" };
  }
}

export default async function CommunityHomePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  let community;
  try {
    community = await getCommunityBySlug(slug, profile?.id);
  } catch {
    community = null;
  }
  if (!community) notFound();

  const adminCount = community.members.filter((m) => m.role === "admin").length;
  const canLeave =
    community.viewerRole != null &&
    leaveBlockedReason(community.viewerRole, adminCount) == null;
  const signInHref = `/auth/sign-in?next=/communities/${encodeURIComponent(community.slug)}`;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-7xl">
        {community.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {community.memberCount}{" "}
        {community.memberCount === 1 ? "member" : "members"}
      </p>
      {community.description ? (
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted">
          {community.description}
        </p>
      ) : null}

      {profile ? (
        <MembershipActions
          slug={community.slug}
          isMember={community.viewerRole != null}
          canLeave={canLeave}
        />
      ) : user ? (
        <p className="mt-6 text-sm text-muted">
          <Link href="/account" className="text-accent hover:underline">
            Finish your profile
          </Link>{" "}
          to join this community.
        </p>
      ) : (
        <p className="mt-6 text-sm text-muted">
          <Link href={signInHref} className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join this community.
        </p>
      )}

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Members
        </h2>
        {community.members.length === 0 ? (
          <p className="mt-4 text-muted">No members yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {community.members.map((member) => (
              <li key={member.profileId} className="py-4">
                <Link
                  href={`/u/${member.username}`}
                  className="text-ink hover:text-accent"
                >
                  {member.displayName}
                </Link>
                <p className="text-sm text-muted">@{member.username}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
