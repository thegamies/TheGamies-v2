import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/lib/auth/server";
import {
  getProfileByUsername,
  ownsProfile,
} from "@/lib/profile/service";

type Params = Promise<{ username: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile || profile.visibility === "private") {
    return { title: "Profile" };
  }
  return {
    title: profile.displayName,
    description: profile.bio ?? `${profile.displayName} on The Gamies`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Params;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile) {
    notFound();
  }

  const { data: session } = await auth.getSession();
  const isOwner = ownsProfile(profile, session?.user?.id);

  if (profile.visibility === "private" && !isOwner) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          @{profile.username}
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          {profile.displayName}
        </h1>
        {profile.visibility === "private" && isOwner ? (
          <p className="mt-2 text-sm text-muted">
            This profile is private — only you can see it here.
          </p>
        ) : null}
        {profile.bio ? (
          <p className="mt-6 max-w-2xl text-lg text-muted">{profile.bio}</p>
        ) : (
          <p className="mt-6 text-muted">No bio yet.</p>
        )}
      </main>
    </>
  );
}
