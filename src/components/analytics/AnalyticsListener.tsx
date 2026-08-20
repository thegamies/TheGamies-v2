"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics/gtag";

export function AnalyticsListener({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    trackPageView(measurementId, path);
  }, [measurementId, pathname, searchParams]);

  return null;
}
