import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function POST(request: Request) {
  return proxyWebhooksWorker(request, "/admin/events/cleanup", {
    method: "POST",
  });
}
