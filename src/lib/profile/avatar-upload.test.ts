import { describe, expect, it } from "vitest";
import {
  avatarObjectKey,
  buildAvatarPublicUrl,
  buildCommunityImagePublicUrl,
  buildProfileBannerPublicUrl,
  communityAvatarObjectKey,
  communityBannerObjectKey,
  isJpegBytePayload,
  isPngBytePayload,
  isWebpBytePayload,
  detectCustomCategoryImageKind,
  profileBannerObjectKey,
  validateAvatarUploadInput,
  validateBannerUploadInput,
} from "./avatar-upload";

describe("avatar upload helpers", () => {
  it("builds the R2 object key and public URL", () => {
    expect(avatarObjectKey("abc")).toBe("avatars/abc/avatar.jpg");
    expect(buildAvatarPublicUrl("https://cdn.example.com/", "abc")).toBe(
      "https://cdn.example.com/avatars/abc/avatar.jpg",
    );
  });

  it("builds profile and community banner keys", () => {
    expect(profileBannerObjectKey("abc")).toBe("avatars/abc/banner.jpg");
    expect(buildProfileBannerPublicUrl("https://cdn.example.com/", "abc")).toBe(
      "https://cdn.example.com/avatars/abc/banner.jpg",
    );
    expect(communityAvatarObjectKey("c1")).toBe("communities/c1/avatar.jpg");
    expect(communityBannerObjectKey("c1")).toBe("communities/c1/banner.jpg");
    expect(
      buildCommunityImagePublicUrl("https://cdn.example.com/", "c1", "banner"),
    ).toBe("https://cdn.example.com/communities/c1/banner.jpg");
  });

  it("accepts JPEG bytes within the size cap", () => {
    validateAvatarUploadInput({
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    validateBannerUploadInput({
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    expect(isJpegBytePayload(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBe(
      true,
    );
    expect(isPngBytePayload(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBe(
      true,
    );
    expect(() =>
      validateAvatarUploadInput({
        contentType: "image/png",
        contentLength: 10,
      }),
    ).toThrow(/JPEG/i);
  });

  it("detects JPEG and WebP for custom category images", () => {
    expect(
      detectCustomCategoryImageKind(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
    ).toEqual({ ext: "jpg", contentType: "image/jpeg" });

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(isWebpBytePayload(webp.buffer)).toBe(true);
    expect(detectCustomCategoryImageKind(webp.buffer)).toEqual({
      ext: "webp",
      contentType: "image/webp",
    });

    expect(
      detectCustomCategoryImageKind(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
      ),
    ).toBeNull();
  });
});