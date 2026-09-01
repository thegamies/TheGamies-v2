"use client";

import { useActionState } from "react";
import { joinCommunityPublicAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function CommunityJoinPublicForm({
  slug,
  signedIn,
  hasProfile,
}: {
  slug: string;
  signedIn: boolean;
  hasProfile: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    joinCommunityPublicAction,
    null,
  );

  if (!signedIn) {
    return (
      <div className="mt-6">
        <Link
          href={`/auth/sign-in?next=/communities/${encodeURIComponent(slug)}`}
          rel="nofollow"
        >
          <Button type="button" variant="accent-bordered">
            Sign in to join
          </Button>
        </Link>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mt-6">
        <Link href="/account">
          <Button type="button" variant="accent-bordered">
            Finish your profile to join
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" variant="accent-bordered" disabled={pending}>
        {pending ? "Joining…" : "Join community"}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
