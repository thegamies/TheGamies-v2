export const SOCIAL_LINK_KEYS = [
  "x",
  "youtube",
  "twitch",
  "bluesky",
  "website",
] as const;

export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export type SocialLinks = Partial<Record<SocialLinkKey, string | null>>;

export const SOCIAL_LINK_LABELS: Record<SocialLinkKey, string> = {
  x: "X",
  youtube: "YouTube",
  twitch: "Twitch",
  bluesky: "Bluesky",
  website: "Website",
};

export const SOCIAL_LINK_PLACEHOLDERS: Record<SocialLinkKey, string> = {
  x: "username",
  youtube: "channel",
  twitch: "username",
  bluesky: "handle.bsky.social",
  website: "https://example.com",
};

export const SOCIAL_LINK_URL_MAX_LENGTH = 500;

const KEY_SET = new Set<string>(SOCIAL_LINK_KEYS);

const HOST_ALLOWLIST: Record<Exclude<SocialLinkKey, "website">, RegExp> = {
  x: /^(www\.)?(x\.com|twitter\.com)$/i,
  youtube: /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)$/i,
  twitch: /^(www\.)?twitch\.tv$/i,
  bluesky: /^(www\.)?bsky\.app$/i,
};

const KNOWN_HOST_PREFIX =
  /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com|youtube\.com|youtu\.be|m\.youtube\.com|twitch\.tv|bsky\.app)(?:\/|$)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripAt(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

function looksLikeAbsoluteUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw) || KNOWN_HOST_PREFIX.test(raw);
}

function parseHttpsUrl(raw: string): URL {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("invalid-url");
  }
  if (url.protocol !== "https:") {
    throw new Error("https");
  }
  return url;
}

function assertAllowedHost(key: Exclude<SocialLinkKey, "website">, url: URL) {
  if (!HOST_ALLOWLIST[key].test(url.hostname)) {
    throw new Error("host");
  }
}

function firstPathSegment(url: URL): string {
  return url.pathname.split("/").filter(Boolean)[0] ?? "";
}

/** Stored URL → form field (handle for platforms, URL for website). */
export function socialLinkUrlToHandle(
  key: SocialLinkKey,
  stored: string | null | undefined,
): string {
  if (!stored?.trim()) return "";
  const trimmed = stored.trim();
  if (key === "website") return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return stripAt(trimmed);
  }

  if (key === "x") {
    return firstPathSegment(url);
  }
  if (key === "twitch") {
    return firstPathSegment(url);
  }
  if (key === "youtube") {
    const seg = firstPathSegment(url);
    return stripAt(decodeURIComponent(seg));
  }
  if (key === "bluesky") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "profile" && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    return firstPathSegment(url);
  }
  return trimmed;
}

/** Handle (or pasted URL) → canonical https URL for storage. */
export function buildSocialLinkUrl(key: SocialLinkKey, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${SOCIAL_LINK_LABELS[key]} is required.`);
  }

  if (key === "website") {
    try {
      return parseHttpsUrl(trimmed).toString();
    } catch (err) {
      if (err instanceof Error && err.message === "https") {
        throw new Error("Website must use https.");
      }
      throw new Error("Website must be a valid web address.");
    }
  }

  if (looksLikeAbsoluteUrl(trimmed)) {
    let url: URL;
    try {
      url = parseHttpsUrl(trimmed);
    } catch (err) {
      if (err instanceof Error && err.message === "https") {
        throw new Error(`${SOCIAL_LINK_LABELS[key]} link must use https.`);
      }
      throw new Error(
        `${SOCIAL_LINK_LABELS[key]} must be a username or ${SOCIAL_LINK_LABELS[key]} address.`,
      );
    }
    try {
      assertAllowedHost(key, url);
    } catch {
      throw new Error(
        `${SOCIAL_LINK_LABELS[key]} must be a ${SOCIAL_LINK_LABELS[key]} address or username.`,
      );
    }
    return url.toString();
  }

  const handle = key === "bluesky" ? trimmed.replace(/^@+/, "") : stripAt(trimmed);
  if (!handle || /\s/.test(handle) || /[/?#]/.test(handle)) {
    throw new Error(`${SOCIAL_LINK_LABELS[key]} username is not valid.`);
  }

  if (key === "x") {
    return `https://x.com/${handle}`;
  }
  if (key === "twitch") {
    return `https://www.twitch.tv/${handle}`;
  }
  if (key === "youtube") {
    return `https://www.youtube.com/@${handle}`;
  }
  return `https://bsky.app/profile/${handle}`;
}

/** Normalize DB/API JSON into a sparse SocialLinks object (only non-empty https URLs). */
export function normalizeSocialLinks(value: unknown): SocialLinks {
  if (!isPlainObject(value)) return {};

  const out: SocialLinks = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const raw = value[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    out[key] = trimmed;
  }
  return out;
}

function fieldError(key: SocialLinkKey, err: unknown): never {
  if (err instanceof Error) throw err;
  throw new Error(`${SOCIAL_LINK_LABELS[key]} could not be saved.`);
}

/**
 * Validate and normalize a partial socialLinks patch.
 * Platforms accept a username/handle or a full https URL.
 * Website must be a full URL (https is added if the scheme is omitted).
 * Unknown keys rejected. Empty string / null clears that key.
 */
export function validateAndNormalizeSocialLinksPatch(
  input: unknown,
): SocialLinks {
  if (!isPlainObject(input)) {
    throw new Error("Social links must be an object.");
  }

  for (const key of Object.keys(input)) {
    if (!KEY_SET.has(key)) {
      throw new Error(`Unknown social link: ${key}`);
    }
  }

  const out: SocialLinks = {};

  for (const key of SOCIAL_LINK_KEYS) {
    if (!(key in input)) continue;
    const raw = input[key];

    if (raw === null || raw === undefined) {
      out[key] = null;
      continue;
    }

    if (typeof raw !== "string") {
      throw new Error(
        key === "website"
          ? "Website must be a web address."
          : `${SOCIAL_LINK_LABELS[key]} must be a username.`,
      );
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      out[key] = null;
      continue;
    }

    if (trimmed.length > SOCIAL_LINK_URL_MAX_LENGTH) {
      throw new Error(
        `${SOCIAL_LINK_LABELS[key]} must be ${SOCIAL_LINK_URL_MAX_LENGTH} characters or fewer.`,
      );
    }

    try {
      out[key] = buildSocialLinkUrl(key, trimmed);
    } catch (err) {
      fieldError(key, err);
    }
  }

  return out;
}

/** Merge a validated patch onto existing links (null clears). */
export function mergeSocialLinks(
  existing: unknown,
  patch: SocialLinks,
): SocialLinks {
  const base = normalizeSocialLinks(existing);
  const next: SocialLinks = { ...base };

  for (const key of SOCIAL_LINK_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === null || value === undefined || value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  return next;
}

/** Compact object for DB storage (omit null/empty). */
export function socialLinksForStorage(
  links: SocialLinks,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const value = links[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}
