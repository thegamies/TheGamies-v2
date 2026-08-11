import { NextResponse } from "next/server";
import { getAuthOrNull } from "@/lib/auth/server";

async function notConfigured() {
  return NextResponse.json(
    { error: "Neon Auth is not configured" },
    { status: 503 },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const auth = getAuthOrNull();
  if (!auth) return notConfigured();
  return auth.handler().GET(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const auth = getAuthOrNull();
  if (!auth) return notConfigured();
  return auth.handler().POST(request, context);
}
