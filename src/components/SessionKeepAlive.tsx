"use client";

import { useEffect } from "react";
import {
  SESSION_KEEPALIVE_INTERVAL_MS,
  refreshSessionCookie,
} from "@/lib/auth/session-keepalive";

function pingIfVisible() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  void refreshSessionCookie();
}

/**
 * Refresh the Neon Auth session-cache cookie on the official Auth handler
 * so Set-Cookie reaches the browser. RSC and JSON API routes do not.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    pingIfVisible();
    const id = window.setInterval(pingIfVisible, SESSION_KEEPALIVE_INTERVAL_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") pingIfVisible();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
