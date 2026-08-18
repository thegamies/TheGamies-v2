import { describe, expect, it } from "vitest";
import {
  avatarObjectKey,
  buildAvatarPublicUrl,
  isJpegBytePayload,
  validateAvatarUploadInput,
} from "./avatar-upload";

describe("avatar upload helpers", () => {
  it("builds the R2 object key and public URL", () => {
    expect(avatarObjectKey("abc")).toBe("avatars/abc/avatar.jpg");
    expect(buildAvatarPublicUrl("https://cdn.example.com/", "abc")).toBe(
      "https://cdn.example.com/avatars/abc/avatar.jpg",
    );
  });

  it("accepts JPEG bytes within the size cap", () => {
    validateAvatarUploadInput({
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    expect(isJpegBytePayload(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBe(
      true,
    );
    expect(() =>
      validateAvatarUploadInput({
        contentType: "image/png",
        contentLength: 10,
      }),
    ).toThrow(/JPEG/i);
  });
});
