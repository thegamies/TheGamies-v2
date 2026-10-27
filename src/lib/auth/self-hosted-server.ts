import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { createDb } from "@thegamies/db";
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "@thegamies/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readSelfHostedAuthEnv } from "@/lib/auth/self-hosted-env";
import { sendSelfHostedVerificationEmail } from "@/lib/auth/self-hosted-email";

type AuthResult<T> = { data: T; error: null } | { data: null; error: { message: string; status?: number; code?: string } };

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const record = err as { message?: unknown; body?: { message?: unknown } };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.body?.message === "string" && record.body.message.trim()) {
      return record.body.message;
    }
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function errorStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/**
 * Neon Auth–shaped wrapper around Better Auth so existing call sites keep
 * `getSession` / `signUp.email` / `handler()` / `middleware()`.
 */
export function createSelfHostedAuth() {
  const env = readSelfHostedAuthEnv();
  if (!env) {
    throw new Error(
      "Self-hosted Better Auth is not configured. Set BETTER_AUTH_SECRET (32+ chars) and DATABASE_URL.",
    );
  }

  const db = createDb(env.databaseUrl);
  const ba = betterAuth({
    appName: "The Gamies",
    baseURL: env.baseURL,
    secret: env.secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        try {
          await sendSelfHostedVerificationEmail({
            email: user.email,
            url,
            token,
            appOrigin: env.baseURL,
          });
        } catch (err) {
          console.error("[auth] verification email failed", err);
        }
      },
    },
    advanced: {
      useSecureCookies: env.baseURL.startsWith("https://"),
      defaultCookieAttributes: {
        sameSite: "lax",
        path: "/",
      },
      database: {
        // Spike: avoid hard-failing Workers if schema lag appears mid-deploy.
        validateSchema: false,
      },
    },
    trustedOrigins: [env.baseURL],
    plugins: [nextCookies()],
  });

  const routeHandlers = toNextJsHandler(ba);

  return {
    getSession: async (): Promise<AuthResult<{ user: { id: string; email?: string | null; name?: string | null; emailVerified?: boolean; image?: string | null }; session: unknown } | null>> => {
      try {
        const session = await ba.api.getSession({
          headers: await headers(),
        });
        return { data: session, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: errorMessage(err, "Could not read session."), status: errorStatus(err) },
        };
      }
    },

    signOut: async (): Promise<AuthResult<null>> => {
      try {
        await ba.api.signOut({ headers: await headers() });
        return { data: null, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: errorMessage(err, "Could not sign out."), status: errorStatus(err) },
        };
      }
    },

    signUp: {
      email: async (input: {
        email: string;
        password: string;
        name: string;
        callbackURL?: string;
      }): Promise<
        AuthResult<{
          user: {
            id: string;
            email: string;
            name: string;
            emailVerified: boolean;
            image?: string | null;
          };
          token?: string | null;
        }>
      > => {
        try {
          const data = await ba.api.signUpEmail({
            body: {
              email: input.email,
              password: input.password,
              name: input.name,
              callbackURL: input.callbackURL,
            },
            headers: await headers(),
          });
          return { data, error: null };
        } catch (err) {
          return {
            data: null,
            error: {
              message: errorMessage(err, "Could not create account."),
              status: errorStatus(err),
            },
          };
        }
      },
    },

    handler: () => ({
      GET: (request: Request, _context?: unknown) => routeHandlers.GET(request),
      POST: (request: Request, _context?: unknown) =>
        routeHandlers.POST(request),
    }),

    middleware: ({ loginUrl }: { loginUrl: string }) => {
      return async (request: NextRequest) => {
        try {
          const session = await ba.api.getSession({
            headers: request.headers,
          });
          if (session?.user?.id) {
            return NextResponse.next();
          }
        } catch {
          // Fall through to login redirect.
        }
        const dest = new URL(loginUrl, request.url);
        const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        if (next && next !== "/") {
          dest.searchParams.set("next", next);
        }
        return NextResponse.redirect(dest);
      };
    },

    /** Expose raw Better Auth for advanced call sites (delete, etc.). */
    $ba: ba,
  };
}

export type SelfHostedAuth = ReturnType<typeof createSelfHostedAuth>;
