/**
 * Allowlisted YouTube / Twitch support links for custom category entries.
 * Embeds must not autoplay; YouTube timestamps are preserved.
 */

export type SupportVideoKind = "youtube" | "twitch_clip" | "twitch_vod";

export type ParsedSupportVideoLink = {
  kind: SupportVideoKind;
  /** Canonical watch / clip URL (shareable). */
  canonicalUrl: string;
  /** iframe src (no autoplay). */
  embedUrl: string;
  /** Optional poster / thumbnail when known. */
  posterUrl: string | null;
  /** Start offset in seconds for YouTube. */
  startSeconds: number | null;
};

const YOUTUBE_HOST =
  /^(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;
const TWITCH_HOST = /^(?:www\.)?twitch\.tv$/i;
const TWITCH_CLIPS_HOST = /^(?:www\.)?clips\.twitch\.tv$/i;

function parseTimestampToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // 1h2m3s / 2m3s / 90s
  const match = /^((\d+)h)?((\d+)m)?((\d+)s)?$/i.exec(trimmed);
  if (!match) return null;
  const h = Number(match[2] ?? 0);
  const m = Number(match[4] ?? 0);
  const s = Number(match[6] ?? 0);
  const total = h * 3600 + m * 60 + s;
  return total >= 0 ? total : null;
}

function youtubeStartFromUrl(url: URL): number | null {
  const fromQuery =
    parseTimestampToSeconds(url.searchParams.get("t")) ??
    parseTimestampToSeconds(url.searchParams.get("start"));
  if (fromQuery != null) return fromQuery;

  const hash = url.hash.replace(/^#/, "");
  if (hash.startsWith("t=")) {
    return parseTimestampToSeconds(hash.slice(2));
  }
  return null;
}

function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "watch") {
    const id = url.searchParams.get("v");
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }
  if (
    (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") &&
    parts[1]
  ) {
    return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
  }
  return null;
}

function twitchParentHosts(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_HOST?.trim();
  const hosts = new Set<string>(["localhost"]);
  if (fromEnv) {
    hosts.add(fromEnv.replace(/^https?:\/\//, "").split("/")[0] ?? fromEnv);
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    hosts.add(window.location.hostname);
  }
  return [...hosts];
}

function twitchEmbedParents(): string {
  return twitchParentHosts()
    .map((h) => `parent=${encodeURIComponent(h)}`)
    .join("&");
}

const MAX_RAW_SUPPORT_LINK_CHARS = 2048;

/**
 * Validate and normalize a support video URL.
 * Returns null-style failure via thrown Error with product copy.
 */
export function parseSupportVideoLink(
  raw: string,
): ParsedSupportVideoLink | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Add a YouTube or Twitch link, or leave this blank." };
  }
  // Pasted share links often include long tracking params; we normalize to a
  // short canonical URL. Cap raw size only to reject abuse, not real shares.
  if (trimmed.length > MAX_RAW_SUPPORT_LINK_CHARS) {
    return { error: "That link is too long." };
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { error: "Enter a valid YouTube or Twitch link." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Enter a valid YouTube or Twitch link." };
  }

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOST.test(host)) {
    const videoId = youtubeVideoId(url);
    if (!videoId) {
      return { error: "That YouTube link could not be recognized." };
    }
    const startSeconds = youtubeStartFromUrl(url);
    const canonical = new URL(`https://www.youtube.com/watch?v=${videoId}`);
    if (startSeconds != null && startSeconds > 0) {
      canonical.searchParams.set("t", String(startSeconds));
    }
    const embed = new URL(
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`,
    );
    embed.searchParams.set("autoplay", "0");
    if (startSeconds != null && startSeconds > 0) {
      embed.searchParams.set("start", String(startSeconds));
    }
    return {
      kind: "youtube",
      canonicalUrl: canonical.toString(),
      embedUrl: embed.toString(),
      posterUrl: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
      startSeconds,
    };
  }

  if (TWITCH_CLIPS_HOST.test(host)) {
    const slug = url.pathname.split("/").filter(Boolean)[0];
    if (!slug || !/^[\w-]+$/.test(slug)) {
      return { error: "That Twitch clip link could not be recognized." };
    }
    const canonicalUrl = `https://clips.twitch.tv/${slug}`;
    const embedUrl = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&${twitchEmbedParents()}&autoplay=false`;
    return {
      kind: "twitch_clip",
      canonicalUrl,
      embedUrl,
      posterUrl: null,
      startSeconds: null,
    };
  }

  if (TWITCH_HOST.test(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    // /videos/123456789
    if (parts[0] === "videos" && parts[1] && /^\d+$/.test(parts[1])) {
      const videoId = parts[1];
      const canonicalUrl = `https://www.twitch.tv/videos/${videoId}`;
      const embedUrl = `https://player.twitch.tv/?video=${encodeURIComponent(videoId)}&${twitchEmbedParents()}&autoplay=false`;
      return {
        kind: "twitch_vod",
        canonicalUrl,
        embedUrl,
        posterUrl: null,
        startSeconds: null,
      };
    }
    // /channel/clip/Slug
    if (parts[1] === "clip" && parts[2] && /^[\w-]+$/.test(parts[2])) {
      const slug = parts[2];
      const canonicalUrl = `https://clips.twitch.tv/${slug}`;
      const embedUrl = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&${twitchEmbedParents()}&autoplay=false`;
      return {
        kind: "twitch_clip",
        canonicalUrl,
        embedUrl,
        posterUrl: null,
        startSeconds: null,
      };
    }
    return {
      error: "Use a Twitch clip or video link, not a channel page.",
    };
  }

  return {
    error: "Supporting links must be YouTube videos or Twitch clips and videos.",
  };
}

export function isSupportVideoParseOk(
  result: ParsedSupportVideoLink | { error: string },
): result is ParsedSupportVideoLink {
  return !("error" in result);
}
