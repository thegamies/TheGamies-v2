import type { ReactNode } from "react";

export function BallotChapterHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`font-display text-3xl tracking-wide text-ink ${eyebrow ? "mt-2" : ""}`}
          >
            {title}
          </h2>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}
