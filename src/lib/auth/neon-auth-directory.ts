/**
 * Neon’s documented way to remove a user from Console → Auth → Users:
 * DELETE /projects/{project_id}/branches/{branch_id}/auth/users/{auth_user_id}
 * https://neon.com/docs/reference/api/auth/delete-branch-neon-auth-user
 */

export function endpointIdFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const host = new URL(databaseUrl.replace(/^postgres(?:ql)?:/i, "http:"))
      .hostname;
    const first = host.split(".")[0];
    if (!first?.startsWith("ep-")) return null;
    return first.replace(/-pooler$/, "");
  } catch {
    return null;
  }
}

type NeonEndpointResponse = {
  endpoint?: { branch_id?: string };
  branch_id?: string;
};

async function resolveBranchId(input: {
  apiKey: string;
  projectId: string;
  databaseUrl: string;
}): Promise<string | null> {
  const fromEnv = process.env.NEON_BRANCH_ID?.trim();
  if (fromEnv) return fromEnv;

  const endpointId = endpointIdFromDatabaseUrl(input.databaseUrl);
  if (!endpointId) return null;

  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${encodeURIComponent(input.projectId)}/endpoints/${encodeURIComponent(endpointId)}`,
    { headers: { Authorization: `Bearer ${input.apiKey}` } },
  );
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as
    | NeonEndpointResponse
    | null;
  return payload?.endpoint?.branch_id ?? payload?.branch_id ?? null;
}

/** Returns true when the Auth user directory no longer has this id. */
export async function deleteNeonAuthUserViaApi(
  authUserId: string,
): Promise<boolean> {
  const apiKey = process.env.NEON_API_KEY?.trim();
  const projectId = process.env.NEON_PROJECT_ID?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!apiKey || !projectId || !databaseUrl || !authUserId.trim()) return false;

  const branchId = await resolveBranchId({ apiKey, projectId, databaseUrl });
  if (!branchId) return false;

  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/auth/users/${encodeURIComponent(authUserId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  return response.ok || response.status === 404;
}
