import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function GET(request: Request) {
  return proxyWebhooksWorker(request, "/admin/settings");
}

export async function PUT(request: Request) {
  const body = await request.text();
  return proxyWebhooksWorker(request, "/admin/settings", {
    method: "PUT",
    body,
  });
}
