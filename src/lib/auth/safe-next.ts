/** Allow only same-origin relative paths (open-redirect safe). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.includes("://")) return null;
  return path;
}
