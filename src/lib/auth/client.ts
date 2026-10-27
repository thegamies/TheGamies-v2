"use client";

import { createAuthClient as createNeonAuthClient } from "@neondatabase/auth/next";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";

/**
 * Prefer Better Auth when the preview/build sets `NEXT_PUBLIC_SELF_HOSTED_AUTH=1`.
 * Both clients talk to same-origin `/api/auth`.
 */
export const authClient =
  process.env.NEXT_PUBLIC_SELF_HOSTED_AUTH === "1"
    ? createBetterAuthClient()
    : createNeonAuthClient();
