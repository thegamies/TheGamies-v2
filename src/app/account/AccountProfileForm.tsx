"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { saveAccountProfile } from "./actions";
import type { Profile } from "@/lib/profile/service";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export function AccountProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(saveAccountProfile, null);

  return (
    <form action={formAction} className="mt-8 max-w-lg space-y-4">
      <label className="block text-sm text-muted">
        Display name
        <input
          name="displayName"
          type="text"
          required
          defaultValue={profile.displayName}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Username
        <input
          name="username"
          type="text"
          required
          defaultValue={profile.username}
          pattern="[A-Za-z0-9_]{3,24}"
          className={fieldClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Bio
        <textarea
          name="bio"
          rows={4}
          defaultValue={profile.bio ?? ""}
          maxLength={500}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Visibility
        <select
          name="visibility"
          defaultValue={profile.visibility}
          className={fieldClass}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>
      {state?.error ? (
        <p className="text-sm text-accent">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
