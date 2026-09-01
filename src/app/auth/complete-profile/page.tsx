import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthOrNull } from "@/lib/auth/server";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  POST_AUTH_NEXT_COOKIE,
  parsePostAuthNextCookie,
} from "@/lib/auth/post-auth-next";
import {
  buildSignInHref,
  resolvePostAuthRedirect,
} from "@/lib/auth/return-to";
import { suggestAvailableUsername } from "@/lib/profile/service";
import { suggestDisplayNameFromIdentity } from "@/lib/profile/username";
import { neonAuthSessionVerifierFromSearch } from "@/lib/auth/neon-auth-session-verifier";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { CompleteProfileSessionClient } from "./CompleteProfileSessionClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose how you appear",
  robots: { index: false, follow: false },
};

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    intent?: string;
    neon_auth_session_verifier?: string;
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const next = resolvePostAuthRedirect(
    params.next || parsePostAuthNextCookie(cookieStore.get(POST_AUTH_NEXT_COOKIE)?.value),
    params.intent,
  );

  if (neonAuthSessionVerifierFromSearch(params.neon_auth_session_verifier)) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
          Choose how you appear
        </h1>
        <CompleteProfileSessionClient next={next} />
      </main>
    );
  }

  const signInHref = buildSignInHref({ next });
  const auth = getAuthOrNull();
  if (!auth) {
    redirect(signInHref);
  }

  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect(signInHref);
  }

  const profile = await getRequestProfileByAuthUserId(user.id);
  if (profile) {
    redirect(next);
  }

  const identity = {
    name: user.name,
    email: user.email,
  };
  const suggestedUsername = await suggestAvailableUsername(identity);
  const suggestedDisplayName = suggestDisplayNameFromIdentity(identity);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Choose how you appear
      </h1>
      <p className="mt-3 text-muted">
        These start from your Google account. Keep them or change them before
        you continue.
      </p>
      <CompleteProfileForm
        next={next}
        suggestedDisplayName={suggestedDisplayName}
        suggestedUsername={suggestedUsername}
        googleImageUrl={user.imageUrl}
      />
    </main>
  );
}
