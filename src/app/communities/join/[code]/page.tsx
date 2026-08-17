import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CommunityJoinForm } from "./CommunityJoinForm";
import { Button } from "@/components/ui/Button";
import { getCommunityInvitePreview } from "@/lib/communities/service";
import { parseInviteCode } from "@/lib/communities/invite-code";

type Params = Promise<{ code: string }>;

export const metadata: Metadata = {
  title: "Join community",
  robots: { index: false, follow: false },
};

export default async function CommunityJoinPage({
  params,
}: {
  params: Params;
}) {
  const { code: codeRaw } = await params;
  const code = parseInviteCode(decodeURIComponent(codeRaw));
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  const preview = code
    ? await getCommunityInvitePreview(code, profile?.id).catch(() => null)
    : null;

  if (preview?.alreadyMember) {
    redirect(`/communities/${preview.slug}`);
  }

  const next = `/communities/join/${encodeURIComponent(codeRaw)}`;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      {preview && code ? (
        <>
          <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
            {preview.name}
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            You are invited to join this community.
          </p>
          {profile ? (
            <CommunityJoinForm code={code} communityName={preview.name} />
          ) : user ? (
            <p className="mt-6 text-sm text-muted">
              <Link href="/account" className="text-accent hover:underline">
                Finish your profile
              </Link>{" "}
              to join.
            </p>
          ) : (
            <p className="mt-6">
              <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`}>
                <Button type="button">Sign in to join</Button>
              </Link>
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
            Invite
          </h1>
          <p className="mt-6 max-w-xl text-muted">
            That invite is not valid.
          </p>
        </>
      )}
    </main>
  );
}
