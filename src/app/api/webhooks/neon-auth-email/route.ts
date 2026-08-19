import { NextResponse } from "next/server";
import { neonAuthJwksUrl, verifyNeonAuthWebhook } from "@/lib/email/neon-webhook";
import { buildAuthEmail, sendAuthEmail } from "@/lib/email/send";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!baseUrl) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  let payload;
  try {
    payload = await verifyNeonAuthWebhook({
      rawBody,
      signature: request.headers.get("x-neon-signature"),
      kid: request.headers.get("x-neon-signature-kid"),
      timestamp: request.headers.get("x-neon-timestamp"),
      jwksUrl: neonAuthJwksUrl(baseUrl),
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 401 });
  }

  const message = buildAuthEmail(payload);
  if (!message) {
    const eventType = payload.event_type ?? "";
    if (eventType === "send.otp" || eventType === "send.magic_link") {
      console.error("auth-email-unmapped", eventType);
      return NextResponse.json(
        { error: "Could not build email." },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await sendAuthEmail(message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("auth-email-send-failed", reason);
    return NextResponse.json(
      { error: "Could not send email." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
