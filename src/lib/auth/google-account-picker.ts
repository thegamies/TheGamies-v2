/** Forces Google's account chooser after sign-out. */
export const GOOGLE_ACCOUNT_PROMPT = "select_account";

/**
 * Sign-out clears this site's session only. Without this prompt, Google
 * silently reuses the last account that authorized the app.
 */
export function withGoogleAccountPicker(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!isGoogleAuthorizeHost(url.hostname)) return href;
  const parts = new Set(
    (url.searchParams.get("prompt") ?? "")
      .split(/[\s+]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== "none"),
  );
  parts.add(GOOGLE_ACCOUNT_PROMPT);
  url.searchParams.set("prompt", [...parts].join(" "));
  return url.toString();
}

export function isGoogleAuthorizeHost(hostname: string): boolean {
  return (
    hostname === "accounts.google.com" || hostname.startsWith("accounts.google.")
  );
}
