"use client";

import { useEffect, useState } from "react";
import type { GoogleFcApi } from "@/lib/ads/funding-choices";

function googleFc(): GoogleFcApi {
  const existing = window.googlefc;
  if (existing) return existing;
  const created: GoogleFcApi = { callbackQueue: [] };
  window.googlefc = created;
  return created;
}

/** Re-open Google’s certified ads consent message (EEA / UK / Switzerland). */
export function AdPrivacyOptions() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fc = googleFc();
    fc.callbackQueue = fc.callbackQueue ?? [];
    fc.callbackQueue.push({
      CONSENT_API_READY: () => setReady(true),
    });
  }, []);

  if (!ready) return null;

  return (
    <span className="inline-flex items-center gap-x-1">
      <span className="text-line" aria-hidden>
        ·
      </span>
      <button
        type="button"
        className="transition-colors hover:text-ink"
        onClick={() => window.googlefc?.showRevocationMessage?.()}
      >
        Ad privacy
      </button>
    </span>
  );
}
