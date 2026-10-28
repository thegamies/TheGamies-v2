"use client";

import { createAuthClient } from "better-auth/react";

/** Browser client for same-origin `/api/auth` (self-hosted Better Auth). */
export const authClient = createAuthClient();
