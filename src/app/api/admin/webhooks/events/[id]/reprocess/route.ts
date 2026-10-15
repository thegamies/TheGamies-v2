import { proxyWebhooksWorker } from "@/lib/admin-webhooks-proxy";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Invalid event id." }, { status: 400 });
  }
  return proxyWebhooksWorker(request, `/admin/events/${id}/reprocess`, {
    method: "POST",
  });
}
