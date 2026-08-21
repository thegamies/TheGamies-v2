import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyWebhooksWorker(request, "/admin/register/test", {
    method: "POST",
    body,
  });
}
