import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@thegamies/igdb";
import { processEditionFreezeQueue } from "@/lib/communities/edition-freeze";

export const maxDuration = 300;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return timingSafeEqualString(header, `Bearer ${secret}`);
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await processEditionFreezeQueue({ limit: 5 });
    return NextResponse.json({ ok: true, ...summary });
  } catch {
    return NextResponse.json(
      { error: "Could not process edition freeze queue." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
