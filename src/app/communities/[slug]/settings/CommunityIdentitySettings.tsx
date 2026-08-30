"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  removeCommunityImageAction,
  updateCommunityIdentityAction,
  uploadCommunityImageAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { RadioOption } from "@/components/ui/Radio";
import {
  COMMUNITY_DESCRIPTION_MAX,
  COMMUNITY_NAME_MAX,
  type CommunityVisibility,
} from "@/lib/communities/schema";
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

export function CommunityIdentitySettings({
  slug,
  name,
  description,
  visibility,
  socialLinks,
  avatarUrl: initialAvatarUrl,
  bannerUrl: initialBannerUrl,
}: {
  slug: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  socialLinks: unknown;
  avatarUrl: string | null;
  bannerUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [avatarPending, startAvatar] = useTransition();
  const [bannerPending, startBanner] = useTransition();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [identityState, identityAction, identityPending] = useActionState(
    updateCommunityIdentityAction,
    null,
  );
  const socials = normalizeSocialLinks(socialLinks);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  function onPickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    startAvatar(async () => {
      try {
        const jpeg = await resizeAvatarImage(file);
        const data = new FormData();
        data.set("slug", slug);
        data.set("kind", "avatar");
        data.set("image", jpeg);
        const result = await uploadCommunityImageAction(data);
        if (result.error) {
          setAvatarError(result.error);
          return;
        }
        if (result.avatarUrl !== undefined) setAvatarUrl(result.avatarUrl);
      } catch (err) {
        setAvatarError(
          err instanceof Error ? err.message : "Photo could not be saved.",
        );
      } finally {
        if (avatarFileRef.current) avatarFileRef.current.value = "";
      }
    });
  }

  function onRemoveAvatar() {
    setAvatarError(null);
    startAvatar(async () => {
      const data = new FormData();
      data.set("slug", slug);
      data.set("kind", "avatar");
      const result = await removeCommunityImageAction(data);
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
        data.set("slug", slug);
        data.set("kind", "banner");
        data.set("image", jpeg);
        const result = await uploadCommunityImageAction(data);
        if (result.error) {
          setBannerError(result.error);
          return;
        }
        if (result.bannerUrl !== undefined) setBannerUrl(result.bannerUrl);
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
      const data = new FormData();
      data.set("slug", slug);
      data.set("kind", "banner");
      const result = await removeCommunityImageAction(data);
      if (result.error) {
        setBannerError(result.error);
        return;
      }
      setBannerUrl(null);
    });
  }

  return (
    <div className="mt-6 max-w-xl space-y-10">
      <form action={identityAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <h3 className="font-display text-2xl tracking-wide text-ink">
          Name and links
        </h3>
        <p className="text-sm text-muted">
          The URL slug stays the same when you rename the community.
        </p>
        <label className="block text-sm text-muted">
          Name
          <input
            name="name"
            required
            maxLength={COMMUNITY_NAME_MAX}
            defaultValue={name}
            className={fieldInputClass}
          />
        </label>
        <label className="block text-sm text-muted">
          Description
          <textarea
            name="description"
            maxLength={COMMUNITY_DESCRIPTION_MAX}
            rows={4}
            defaultValue={description}
            className={fieldInputClass}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">Visibility</legend>
          <RadioOption
            name="visibility"
            value="private"
            defaultChecked={visibility === "private"}
            hint="Invite only. Not listed on member profiles."
          >
            Private
          </RadioOption>
          <RadioOption
            name="visibility"
            value="public"
            defaultChecked={visibility === "public"}
            hint="Anyone can join, and the community appears on member profiles."
          >
            Public
          </RadioOption>
        </fieldset>
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
                className={fieldInputClass}
              />
            </label>
          ))}
        </fieldset>
        {identityState && "error" in identityState && identityState.error ? (
          <p className="text-sm text-accent" role="alert">
            {identityState.error}
          </p>
        ) : identityState && "ok" in identityState ? (
          <p className="text-sm text-muted" role="status">
            Saved.
          </p>
        ) : null}
        <Button type="submit" disabled={identityPending}>
          {identityPending ? "Saving…" : "Save"}
        </Button>
      </form>

      <div>
        <h3 className="font-display text-2xl tracking-wide text-ink">
          Banner
        </h3>
        <div className="mt-3 overflow-hidden border border-line bg-panel">
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
        <div className="mt-3 flex flex-wrap gap-2">
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
        <h3 className="font-display text-2xl tracking-wide text-ink">Photo</h3>
        <div className="mt-3 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full border border-line object-cover"
            />
          ) : (
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-line bg-panel font-display text-2xl tracking-wide text-ink"
              aria-hidden
            >
              {initial}
            </div>
          )}
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
                onClick={onRemoveAvatar}
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
            Square JPEG, PNG, or WebP. Cropped to 400×400.
          </p>
        )}
      </div>
    </div>
  );
}
