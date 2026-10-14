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
 * Ping the Auth route on an interval while the tab is visible. A valid
 * session-cache cookie stays on the request so Neon is not called. Focusing
 * the tab does not ping again.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    pingIfVisible();
    const id = window.setInterval(pingIfVisible, SESSION_KEEPALIVE_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return null;
}
