import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyWebhooksWorker(
    request,
    `/admin/events${url.search}`,
  );
}
