import { NextResponse } from "next/server";
import { getAuthOrNull } from "@/lib/auth/server";

const auth = getAuthOrNull();
const handler = auth?.handler();

async function notConfigured() {
  return NextResponse.json(
    { error: "Neon Auth is not configured" },
    { status: 503 },
  );
}

export const GET = handler?.GET ?? notConfigured;
export const POST = handler?.POST ?? notConfigured;
