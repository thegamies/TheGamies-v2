"use client";

import { RouteStatus } from "@/components/ui/RouteStatus";

export default function CommunityError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteStatus status="error" onRetry={reset} />;
}
