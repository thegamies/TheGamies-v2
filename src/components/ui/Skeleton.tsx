import { type HTMLAttributes } from "react";

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={`skeleton-pulse rounded-[var(--radius-control)] bg-panel border border-line ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCover({ className = "" }: { className?: string }) {
  return (
    <Skeleton className={`aspect-[3/4] w-full rounded-[var(--radius-artwork)] ${className}`} />
  );
}

export function SkeletonBallotRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-4 border-b border-line py-3 ${className}`}
    >
      <Skeleton className="h-8 w-8 shrink-0" />
      <SkeletonCover className="w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStandingsRow({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[3rem_3rem_1fr_4rem_4rem] items-center gap-3 border-b border-line py-3 ${className}`}
    >
      <Skeleton className="h-6 w-8" />
      <SkeletonCover className="w-10" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
