/** Accent-led chapter rule used between major results sections. */
export function SectionRule({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full items-center gap-0 ${className}`}
      aria-hidden="true"
    >
      <span className="h-0.5 w-10 shrink-0 bg-accent sm:w-14" />
      <span className="h-px min-w-0 flex-1 bg-line" />
    </div>
  );
}
