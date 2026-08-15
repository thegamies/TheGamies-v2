/** Accent-led chapter rule used between major results sections. */
export function SectionRule({
  className = "",
  variant = "tick",
}: {
  className?: string;
  /**
   * `tick` — short accent + muted hairline (edition chapters).
   * `bar` — full-width accent rule (live category chapters).
   */
  variant?: "tick" | "bar";
}) {
  if (variant === "bar") {
    return (
      <div
        className={`h-0.5 w-full bg-accent ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`flex items-center gap-0 ${className}`}
      aria-hidden="true"
    >
      <span className="h-0.5 w-10 shrink-0 bg-accent sm:w-14" />
      <span className="h-px min-w-0 flex-1 bg-line" />
    </div>
  );
}
