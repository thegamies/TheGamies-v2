import { isAdminAuthorized } from "@/lib/admin-auth";

export function webhooksWorkerBaseUrl(): string | null {
  const raw = process.env.IGDB_WEBHOOKS_WORKER_URL?.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function proxyWebhooksWorker(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const base = webhooksWorkerBaseUrl();
  const secret = process.env.ADMIN_SYNC_SECRET;
  if (!base || !secret) {
    return Response.json(
      { error: "Webhook worker is not configured." },
      { status: 503 },
    );
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("x-admin-sync-secret", secret);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Webhook worker unreachable: ${message}` },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
