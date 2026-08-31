"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { USERNAME_FORMAT_MESSAGE } from "@/lib/profile/username";
import {
  completeGoogleProfile,
  type CompleteProfileState,
} from "./actions";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

type Props = {
  next: string;
  suggestedDisplayName: string;
  suggestedUsername: string;
  googleImageUrl?: string | null;
};

export function CompleteProfileForm({
  next,
  suggestedDisplayName,
  suggestedUsername,
  googleImageUrl = null,
}: Props) {
  const [state, formAction, pending] = useActionState(
    completeGoogleProfile,
    null as CompleteProfileState,
  );

  return (
    <form action={formAction} className="mt-10 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex items-center gap-4">
        <UserAvatar
          displayName={suggestedDisplayName}
          username={suggestedUsername}
          avatarUrl={googleImageUrl}
          size={56}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{suggestedDisplayName}</p>
          <p className="truncate text-sm text-muted">@{suggestedUsername}</p>
        </div>
      </div>
      <label className="block text-sm text-muted">
        Display name
        <input
          name="displayName"
          type="text"
          required
          autoComplete="name"
          defaultValue={suggestedDisplayName}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Username
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          pattern="[A-Za-z0-9_]{3,24}"
          defaultValue={suggestedUsername}
          className={fieldClass}
        />
      </label>
      <p className="text-xs text-muted">{USERNAME_FORMAT_MESSAGE}</p>
      {state?.error ? (
        <p className="text-sm text-accent">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
