import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function POST(request: Request) {
  return proxyWebhooksWorker(request, "/internal/drain", { method: "POST" });
}
