import { NextResponse } from "next/server";
import { readAuthEnv } from "@/lib/auth/auth-env";
import { resolveSocialInitToGoogle } from "@/lib/auth/google-authorize-url";

/**
 * Turn Neon's social init redirect into Google's authorize URL and ask
 * Google to show the account chooser. The browser still has to visit the
 * init URL first so the auth host can store its state cookie.
 */
export async function POST(request: Request) {
  const env = readAuthEnv();
  if (!env) {
    return NextResponse.json({ error: "Auth is not available" }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Could not continue with Google." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not continue with Google." }, { status: 400 });
  }
  const initUrl =
    body && typeof body === "object" && "url" in body && typeof body.url === "string"
      ? body.url
      : "";

  try {
    const href = await resolveSocialInitToGoogle(initUrl, env.baseUrl);
    if (!href) {
      return NextResponse.json(
        { error: "Could not continue with Google." },
        { status: 400 },
      );
    }
    return NextResponse.json({ href });
  } catch {
    return NextResponse.json(
      { error: "Could not continue with Google." },
      { status: 502 },
    );
  }
}
