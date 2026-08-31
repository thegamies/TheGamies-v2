"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsent,
} from "@/lib/analytics/cookie-consent";
import { updateAnalyticsConsent } from "@/lib/analytics/gtag";

const cardClass =
  "w-[min(20rem,calc(100vw-2rem))] border border-line bg-panel p-4";

/** Client-only flag so the banner is not gated on a GA measurement id. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function CookieConsentBanner({ preview = false }: { preview?: boolean }) {
  const isClient = useIsClient();
  const [picked, setPicked] = useState<CookieConsent | null>(null);

  if (!preview && !isClient) return null;

  const consent = preview ? null : (picked ?? getCookieConsent());
  if (consent !== null) return null;

  const choose = (value: CookieConsent) => {
    setCookieConsent(value);
    updateAnalyticsConsent(value === "accepted");
    setPicked(value);
  };

  return (
    <aside
      role="region"
      aria-label="Cookie consent"
      className={
        preview
          ? cardClass
          : `fixed z-40 ${cardClass} right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,calc(var(--site-ad-bar,0px)+1rem+env(safe-area-inset-bottom)))]`
      }
    >
      <p className="text-sm text-muted">
        Cookies allow us to enhance our services. Do you agree to use of
        non-essential cookies?{" "}
        <Link
          href="/privacy#cookies"
          className="text-ink underline decoration-line underline-offset-2 hover:text-accent"
        >
          Our Cookie Policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => choose("rejected")}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={() => choose("accepted")}
        >
          Accept
        </Button>
      </div>
    </aside>
  );
}
