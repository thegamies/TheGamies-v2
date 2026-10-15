import { NextResponse } from "next/server";
import { BodyTooLargeError, readTextWithLimit } from "@thegamies/igdb";
import { neonAuthJwksUrl, verifyNeonAuthWebhook } from "@/lib/email/neon-webhook";
import {
  buildAuthEmail,
  isIgnoredAuthEmail,
  isUndeliverableEmailAddress,
  sendAuthEmail,
} from "@/lib/email/send";

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!baseUrl) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await readTextWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    throw error;
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

  const message = buildAuthEmail(payload, {
    appOrigin:
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
      new URL(request.url).origin,
    neonAuthBaseUrl: baseUrl,
  });
  if (!message) {
    if (isIgnoredAuthEmail(payload)) {
      return NextResponse.json({ ok: true, skipped: true });
    }
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

  if (isUndeliverableEmailAddress(message.to)) {
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
