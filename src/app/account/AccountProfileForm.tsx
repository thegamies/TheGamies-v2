"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/profile/UserAvatar";
import {
  checkUsernameAvailable,
  removeAccountAvatar,
  saveAccountProfile,
  uploadAccountAvatar,
} from "./actions";
import { resizeAvatarImage } from "@/lib/profile/resize-avatar";
import {
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  SOCIAL_LINK_PLACEHOLDERS,
  normalizeSocialLinks,
  socialLinkUrlToHandle,
} from "@/lib/profile/social-links";
import type { Profile } from "@/lib/profile/service";
import {
  formatUsernameChangeAllowedOn,
  nextUsernameChangeAllowedAt,
} from "@/lib/profile/username";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export function AccountProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(saveAccountProfile, null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [avatarPending, startAvatar] = useTransition();
  const [, startUsernameCheck] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const socials = normalizeSocialLinks(profile.socialLinks);
  const nextRename = nextUsernameChangeAllowedAt(profile.usernameChangedAt);

  function onPickFile(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    startAvatar(async () => {
      try {
        const jpeg = await resizeAvatarImage(file);
        const data = new FormData();
        data.set("avatar", jpeg);
        const result = await uploadAccountAvatar(data);
        if (result.error) {
          setAvatarError(result.error);
          return;
        }
        if (result.avatarUrl) setAvatarUrl(result.avatarUrl);
      } catch (err) {
        setAvatarError(
          err instanceof Error ? err.message : "Photo could not be saved.",
        );
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function onRemovePhoto() {
    setAvatarError(null);
    startAvatar(async () => {
      const result = await removeAccountAvatar();
      if (result.error) {
        setAvatarError(result.error);
        return;
      }
      setAvatarUrl(null);
    });
  }

  return (
    <form action={formAction} className="mt-8 max-w-lg space-y-4">
      <div>
        <p className="text-sm text-muted">Photo</p>
        <div className="mt-2 flex items-center gap-4">
          <UserAvatar
            displayName={profile.displayName}
            username={profile.username}
            avatarUrl={avatarUrl}
            size={80}
          />
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="bordered"
              size="sm"
              disabled={avatarPending}
              onClick={() => fileRef.current?.click()}
            >
              {avatarPending ? "Saving…" : "Choose photo"}
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                disabled={avatarPending}
                onClick={onRemovePhoto}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        {avatarError ? (
          <p className="mt-2 text-sm text-accent" role="alert">
            {avatarError}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Square JPEG, PNG, or WebP. Photos are cropped to 400×400.
          </p>
        )}
      </div>
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={fieldClass}
          onBlur={(e) => {
            const value = e.target.value;
            if (!value || value.toLowerCase() === profile.username) {
              setUsernameHint(null);
              return;
            }
            startUsernameCheck(async () => {
              const result = await checkUsernameAvailable(value);
              setUsernameHint(result.error ?? null);
            });
          }}
        />
      </label>
      {usernameHint ? (
        <p className="text-sm text-accent" role="status">
          {usernameHint}
        </p>
      ) : null}
      {nextRename ? (
        <p className="text-xs text-muted">
          You can change your username again on{" "}
          {formatUsernameChangeAllowedOn(nextRename)}.
        </p>
      ) : (
        <p className="text-xs text-muted">
          3–24 letters, numbers, or underscores.
        </p>
      )}
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
      <fieldset className="space-y-3">
        <legend className="text-sm text-muted">Social profiles</legend>
        {SOCIAL_LINK_KEYS.map((key) => (
          <label key={key} className="block text-sm text-muted">
            {SOCIAL_LINK_LABELS[key]}
            <input
              name={`social_${key}`}
              type="text"
              inputMode={key === "website" ? "url" : "text"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={socialLinkUrlToHandle(key, socials[key])}
              placeholder={SOCIAL_LINK_PLACEHOLDERS[key]}
              className={fieldClass}
            />
          </label>
        ))}
      </fieldset>
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
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : state?.ok ? (
        <p className="text-sm text-muted" role="status">
          Profile saved.
        </p>
      ) : null}
      <Button type="submit" disabled={pending || avatarPending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
