import { getIgdbToken, hasIgdbCreds } from "./client";
import type { WebhookEntity, WebhookMethod } from "./webhook-routing";

const API_BASE = "https://api.igdb.com/v4";

export type IgdbWebhookRegistration = {
  id: number;
  url: string;
  category: number;
  sub_category: number;
  active: boolean;
  api_key: string;
  secret: string;
  created_at: string;
  updated_at: string;
};

async function igdbAuthedFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  if (!hasIgdbCreds()) {
    throw new Error("IGDB credentials are not configured");
  }
  const clientId = process.env.IGDB_CLIENT_ID!;
  const token = await getIgdbToken();
  return fetch(`${API_BASE}/${path}`, {
    ...init,
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function listIgdbWebhooks(): Promise<IgdbWebhookRegistration[]> {
  const res = await igdbAuthedFetch("webhooks/", { method: "GET" });
  if (!res.ok) {
    throw new Error(`List webhooks failed: ${res.status}`);
  }
  return (await res.json()) as IgdbWebhookRegistration[];
}

export async function registerIgdbWebhook(
  entity: WebhookEntity,
  method: WebhookMethod,
  url: string,
  secret: string,
): Promise<IgdbWebhookRegistration> {
  const body = new URLSearchParams({ url, secret, method });
  const res = await igdbAuthedFetch(`${entity}/webhooks/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Register webhook failed: ${res.status} ${text}`);
  }
  return (await res.json()) as IgdbWebhookRegistration;
}

export async function deleteIgdbWebhook(
  webhookId: number,
): Promise<IgdbWebhookRegistration> {
  const res = await igdbAuthedFetch(`webhooks/${webhookId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Delete webhook failed: ${res.status}`);
  }
  return (await res.json()) as IgdbWebhookRegistration;
}

export async function testIgdbWebhook(
  entity: WebhookEntity,
  webhookId: number,
  entityId: number,
): Promise<unknown> {
  const res = await igdbAuthedFetch(
    `${entity}/webhooks/test/${webhookId}?entityId=${entityId}`,
    { method: "POST" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Test webhook failed: ${res.status} ${text}`);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
