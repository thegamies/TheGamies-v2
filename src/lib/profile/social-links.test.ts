import { describe, expect, it } from "vitest";
import {
  buildSocialLinkUrl,
  mergeSocialLinks,
  normalizeSocialLinks,
  socialLinkUrlToHandle,
  socialLinksForStorage,
  validateAndNormalizeSocialLinksPatch,
} from "./social-links";

describe("validateAndNormalizeSocialLinksPatch", () => {
  it("accepts https platform hosts and a website", () => {
    expect(
      validateAndNormalizeSocialLinksPatch({
        x: "https://x.com/thegamies",
        youtube: "https://www.youtube.com/@thegamies",
        twitch: "https://twitch.tv/thegamies",
        bluesky: "https://bsky.app/profile/thegamies.gg",
        website: "https://thegamies.gg/",
      }),
    ).toEqual({
      x: "https://x.com/thegamies",
      youtube: "https://www.youtube.com/@thegamies",
      twitch: "https://twitch.tv/thegamies",
      bluesky: "https://bsky.app/profile/thegamies.gg",
      website: "https://thegamies.gg/",
    });
  });

  it("accepts platform usernames and builds https URLs", () => {
    expect(
      validateAndNormalizeSocialLinksPatch({
        x: "@thegamies",
        youtube: "thegamies",
        twitch: "thegamies",
        bluesky: "thegamies.bsky.social",
        website: "thegamies.gg",
      }),
    ).toEqual({
      x: "https://x.com/thegamies",
      youtube: "https://www.youtube.com/@thegamies",
      twitch: "https://www.twitch.tv/thegamies",
      bluesky: "https://bsky.app/profile/thegamies.bsky.social",
      website: "https://thegamies.gg/",
    });
  });

  it("rejects http and off-platform hosts", () => {
    expect(() =>
      validateAndNormalizeSocialLinksPatch({ x: "http://x.com/thegamies" }),
    ).toThrow(/https/i);
    expect(() =>
      validateAndNormalizeSocialLinksPatch({ x: "https://example.com/x" }),
    ).toThrow(/X /);
  });

  it("clears empty keys and rejects unknown keys", () => {
    expect(validateAndNormalizeSocialLinksPatch({ twitch: "" })).toEqual({
      twitch: null,
    });
    expect(() =>
      validateAndNormalizeSocialLinksPatch({ discord: "https://discord.gg/x" }),
    ).toThrow(/Unknown social link/i);
  });
});

describe("buildSocialLinkUrl / socialLinkUrlToHandle", () => {
  it("round-trips platform handles through stored URLs", () => {
    const url = buildSocialLinkUrl("x", "thegamies");
    expect(url).toBe("https://x.com/thegamies");
    expect(socialLinkUrlToHandle("x", url)).toBe("thegamies");
    expect(
      socialLinkUrlToHandle("youtube", "https://www.youtube.com/@thegamies"),
    ).toBe("thegamies");
    expect(
      socialLinkUrlToHandle(
        "bluesky",
        "https://bsky.app/profile/thegamies.bsky.social",
      ),
    ).toBe("thegamies.bsky.social");
    expect(socialLinkUrlToHandle("website", "https://thegamies.gg/")).toBe(
      "https://thegamies.gg/",
    );
  });
});

describe("normalizeSocialLinks / merge", () => {
  it("stores a sparse object after a patch", () => {
    const merged = mergeSocialLinks(
      { x: "https://x.com/old" },
      validateAndNormalizeSocialLinksPatch({
        x: "",
        website: "https://example.com",
      }),
    );
    expect(merged).toEqual({ website: "https://example.com/" });
    expect(socialLinksForStorage(merged)).toEqual({
      website: "https://example.com/",
    });
    expect(normalizeSocialLinks({ x: "  ", extra: "nope" })).toEqual({});
  });
});
