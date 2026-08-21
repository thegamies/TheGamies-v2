import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyWebhooksWorker(request, `/admin/events/${id}/reprocess`, {
    method: "POST",
  });
}
