import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

export async function GET(request: Request) {
  return proxyWebhooksWorker(request, "/admin/register");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyWebhooksWorker(request, "/admin/register", {
    method: "POST",
    body,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const webhookId = url.searchParams.get("webhookId");
  if (!webhookId) {
    return Response.json({ error: "Missing webhook id." }, { status: 400 });
  }
  return proxyWebhooksWorker(request, `/admin/register/${webhookId}`, {
    method: "DELETE",
  });
}
