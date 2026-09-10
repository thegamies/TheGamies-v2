import { describe, expect, it } from "vitest";
import {
  isSupportVideoParseOk,
  parseSupportVideoLink,
} from "./support-video-link";

describe("parseSupportVideoLink", () => {
  it("parses YouTube watch URLs and preserves timestamps", () => {
    const parsed = parseSupportVideoLink(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90",
    );
    expect(isSupportVideoParseOk(parsed)).toBe(true);
    if (!isSupportVideoParseOk(parsed)) return;
    expect(parsed.kind).toBe("youtube");
    expect(parsed.startSeconds).toBe(90);
    expect(parsed.embedUrl).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(parsed.embedUrl).toContain("autoplay=0");
    expect(parsed.embedUrl).toContain("start=90");
    expect(parsed.canonicalUrl).toContain("t=90");
  });

  it("parses youtu.be and #t= timestamps", () => {
    const parsed = parseSupportVideoLink("https://youtu.be/dQw4w9WgXcQ#t=1m30s");
    expect(isSupportVideoParseOk(parsed)).toBe(true);
    if (!isSupportVideoParseOk(parsed)) return;
    expect(parsed.startSeconds).toBe(90);
  });

  it("parses Twitch clips and VODs without autoplay", () => {
    const clip = parseSupportVideoLink("https://clips.twitch.tv/SomeClip-Slug");
    expect(isSupportVideoParseOk(clip)).toBe(true);
    if (!isSupportVideoParseOk(clip)) return;
    expect(clip.kind).toBe("twitch_clip");
    expect(clip.embedUrl).toContain("autoplay=false");

    const vod = parseSupportVideoLink("https://www.twitch.tv/videos/123456789");
    expect(isSupportVideoParseOk(vod)).toBe(true);
    if (!isSupportVideoParseOk(vod)) return;
    expect(vod.kind).toBe("twitch_vod");
    expect(vod.embedUrl).toContain("autoplay=false");
  });

  it("accepts long YouTube share links and stores a short canonical URL", () => {
    const tracking = "x".repeat(600);
    const parsed = parseSupportVideoLink(
      `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest&index=3&pp=${tracking}&t=30`,
    );
    expect(isSupportVideoParseOk(parsed)).toBe(true);
    if (!isSupportVideoParseOk(parsed)) return;
    expect(parsed.canonicalUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    );
    expect(parsed.startSeconds).toBe(30);
  });

  it("rejects non-allowlisted hosts", () => {
    const parsed = parseSupportVideoLink("https://vimeo.com/123");
    expect(isSupportVideoParseOk(parsed)).toBe(false);
    if (isSupportVideoParseOk(parsed)) return;
    expect(parsed.error).toMatch(/YouTube|Twitch/i);
  });
});
