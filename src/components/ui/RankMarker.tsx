type RankMarkerProps = {
  rank: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "text-sm min-w-6",
  md: "text-xl min-w-8",
  lg: "text-4xl min-w-12",
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
