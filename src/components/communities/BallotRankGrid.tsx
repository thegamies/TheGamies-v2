import type { ReactNode } from "react";

/** Even Top 10 wrapping grid — ballot editor, closed ballot, Ranked GOTY. */
export const ballotRankGridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5";

export function BallotRankGrid({
  children,
  className = "mt-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={`${className} ${ballotRankGridClass}`}>{children}</ol>;
}
