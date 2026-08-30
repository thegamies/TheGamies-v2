"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/profile/UserAvatar";
import {
  checkUsernameAvailable,
  removeAccountAvatar,
  removeAccountBanner,
  saveAccountProfile,
  uploadAccountAvatar,
  uploadAccountBanner,
} from "./actions";
import {
  resizeAvatarImage,
  resizeBannerImage,
} from "@/lib/profile/resize-avatar";
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
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [avatarPending, startAvatar] = useTransition();
  const [bannerPending, startBanner] = useTransition();
  const [, startUsernameCheck] = useTransition();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const socials = normalizeSocialLinks(profile.socialLinks);
  const nextRename = nextUsernameChangeAllowedAt(profile.usernameChangedAt);
  const mediaPending = avatarPending || bannerPending;

  function onPickAvatar(file: File | undefined) {
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
        if (avatarFileRef.current) avatarFileRef.current.value = "";
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

  function onPickBanner(file: File | undefined) {
    if (!file) return;
    setBannerError(null);
    startBanner(async () => {
      try {
        const jpeg = await resizeBannerImage(file);
        const data = new FormData();
        data.set("banner", jpeg);
        const result = await uploadAccountBanner(data);
        if (result.error) {
          setBannerError(result.error);
          return;
        }
        if (result.bannerUrl) setBannerUrl(result.bannerUrl);
      } catch (err) {
        setBannerError(
          err instanceof Error ? err.message : "Banner could not be saved.",
        );
      } finally {
        if (bannerFileRef.current) bannerFileRef.current.value = "";
      }
    });
  }

  function onRemoveBanner() {
    setBannerError(null);
    startBanner(async () => {
      const result = await removeAccountBanner();
      if (result.error) {
        setBannerError(result.error);
        return;
      }
      setBannerUrl(null);
    });
  }

  return (
    <form action={formAction} className="mt-8 max-w-lg space-y-4">
      <div>
        <p className="text-sm text-muted">Banner</p>
        <div className="mt-2 overflow-hidden border border-line bg-panel">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt=""
              className="aspect-[3/1] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/1] items-center justify-center text-sm text-muted">
              No banner yet
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={bannerFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onPickBanner(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={bannerPending}
            onClick={() => bannerFileRef.current?.click()}
          >
            {bannerPending ? "Saving…" : "Choose banner"}
          </Button>
          {bannerUrl ? (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              disabled={bannerPending}
              onClick={onRemoveBanner}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {bannerError ? (
          <p className="mt-2 text-sm text-accent" role="alert">
            {bannerError}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Wide JPEG, PNG, or WebP. Cropped to 1500×500.
          </p>
        )}
      </div>

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
              ref={avatarFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="bordered"
              size="sm"
              disabled={avatarPending}
              onClick={() => avatarFileRef.current?.click()}
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
      <Button type="submit" disabled={pending || mediaPending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
