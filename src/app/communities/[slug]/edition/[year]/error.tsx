"use client";

import { RouteStatus } from "@/components/ui/RouteStatus";

export default function CommunityEditionError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteStatus status="error" inset onRetry={reset} />;
}
