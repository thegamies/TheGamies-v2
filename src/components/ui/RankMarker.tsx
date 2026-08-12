type RankMarkerProps = {
  rank: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "text-sm min-w-6",
  md: "text-xl min-w-8",
  /** Scales down on narrow viewports so podium ranks fit a 360px layout. */
  lg: "text-2xl min-w-8 sm:text-4xl sm:min-w-12",
};

export function RankMarker({
  rank,
  size = "md",
  className = "",
}: RankMarkerProps) {
  return (
    <span
      className={`inline-flex items-baseline font-display leading-none tracking-wide text-accent ${sizeClass[size]} ${className}`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}
