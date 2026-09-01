/** Site AdSense publisher. Public (appears in page source). Not a secret. */
export const ADSENSE_CLIENT_ID = "ca-pub-9835884276920090";

/** Bottom Display unit. Public (appears in page source). Not a secret. */
export const ADSENSE_BANNER_SLOT = "2718908461";

/** Viewport ad bar height (px). Spacer + overlay share this. */
export const SITE_AD_BAR_PX = 90;

/** Google’s certified seller id for AdSense `ads.txt`. */
export const ADSENSE_CERTIFIED_SELLER_ID = "f08c47fec0942fa0";

/** Middleware stamps the request path so ads can stay off `/auth` and `/account`. */
export const REQUEST_PATHNAME_HEADER = "x-pathname";

/** No ads on sign-in / account HTML (AdSense crawler follows those links). */
export function adsenseAllowedOnPath(
  pathname: string | null | undefined,
): boolean {
  const path = (pathname ?? "/").split("?")[0] || "/";
  if (path === "/auth" || path.startsWith("/auth/")) return false;
  if (path === "/account" || path.startsWith("/account/")) return false;
  return true;
}

const CLIENT_PATTERN = /^ca-pub-\d+$/;
const SLOT_PATTERN = /^\d{8,12}$/;

export function parseAdsenseClientId(
  raw: string | null | undefined,
): string | undefined {
  const id = raw?.trim();
  if (!id || id === "off" || id === "0") return undefined;
  if (!CLIENT_PATTERN.test(id)) return undefined;
  return id;
}

/**
 * Publisher id for the AdSense script. `NEXT_PUBLIC_ADSENSE_CLIENT=off` disables.
 * Unset or blank uses the site publisher. A set value must be `ca-pub-…`.
 *
 * Default (no `env`) reads `process.env.NEXT_PUBLIC_*` as a static path so Next
 * can inline it on the client. Passing `process.env` as an object does not.
 */
export function getAdsenseClientId(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const raw = env
    ? env.NEXT_PUBLIC_ADSENSE_CLIENT
    : process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (raw === undefined || raw.trim() === "") return ADSENSE_CLIENT_ID;
  return parseAdsenseClientId(raw);
}

/** `pub-…` form used by ads.txt and Funding Choices. */
export function adsensePublisherId(clientId: string): string {
  return clientId.replace(/^ca-/, "");
}

export function adsTxtBody(clientId = ADSENSE_CLIENT_ID): string {
  return `google.com, ${adsensePublisherId(clientId)}, DIRECT, ${ADSENSE_CERTIFIED_SELLER_ID}\n`;
}

/**
 * Display unit for the site-bottom banner. `NEXT_PUBLIC_ADSENSE_BANNER_SLOT=off`
 * hides it. Unset or blank uses the site unit. A set value must be the slot
 * number from AdSense.
 */
export function getAdsenseBannerSlot(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const raw = env
    ? env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT
    : process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT;
  if (raw === undefined || raw.trim() === "") return ADSENSE_BANNER_SLOT;
  const slot = raw.trim();
  if (slot === "off" || slot === "0") return undefined;
  if (!SLOT_PATTERN.test(slot)) return undefined;
  return slot;
}

/**
 * Non-monetized AdSense test ads (`data-adtest="on"`).
 * Default on in `next dev`. `NEXT_PUBLIC_ADSENSE_TEST=on` forces it;
 * `off` disables it. Do not ship test ads on the live site.
 */
export function adsenseTestAds(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  const raw = (
    env ? env.NEXT_PUBLIC_ADSENSE_TEST : process.env.NEXT_PUBLIC_ADSENSE_TEST
  )?.trim();
  if (raw === "off" || raw === "0") return false;
  if (raw === "on" || raw === "1") return true;
  const nodeEnv = env ? env.NODE_ENV : process.env.NODE_ENV;
  return nodeEnv === "development";
}
