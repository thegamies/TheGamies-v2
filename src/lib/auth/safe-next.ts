// Browsers drop tab/CR/LF inside URLs and read `\` as `/`, so `/\evil.com`
// or `/\t/evil.com` would leave the site.
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

function isUnsafe(path: string): boolean {
  return (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("://") ||
    UNSAFE_CHARS.test(path)
  );
}

/** Allow only same-origin relative paths (open-redirect safe). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (isUnsafe(path)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (isUnsafe(decoded)) return null;
  return path;
}
