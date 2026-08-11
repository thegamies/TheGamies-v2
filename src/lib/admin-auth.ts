import { cookies } from "next/headers";

export function adminSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SYNC_SECRET);
}

export async function isAdminAuthorized(
  request?: Request,
): Promise<boolean> {
  const secret = process.env.ADMIN_SYNC_SECRET;
  if (!secret) return false;

  const header = request?.headers.get("x-admin-sync-secret");
  if (header && header === secret) return true;

  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin_sync_secret")?.value;
  return cookie === secret;
}
