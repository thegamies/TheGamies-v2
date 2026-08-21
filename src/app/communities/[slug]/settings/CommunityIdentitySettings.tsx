"use client";

import { useRef, useState, useTransition } from "react";
import {
  removeCommunityImageAction,
  uploadCommunityImageAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import {
  resizeAvatarImage,
  resizeBannerImage,
} from "@/lib/profile/resize-avatar";

export function CommunityIdentitySettings({
  slug,
  name,
  avatarUrl: initialAvatarUrl,
  bannerUrl: initialBannerUrl,
}: {
  slug: string;
  name: string;
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
    <div className="mt-6 max-w-xl space-y-8">
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
