import { adsTxtBody, getAdsenseClientId } from "@/lib/ads/adsense";

export function GET() {
  const client = getAdsenseClientId();
  if (!client) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(adsTxtBody(client), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
