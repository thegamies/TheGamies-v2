"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresh RSC payload when the browser restores this page from bfcache (Back). */
export function RefreshOnBfcache() {
  const router = useRouter();

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        router.refresh();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  return null;
}
