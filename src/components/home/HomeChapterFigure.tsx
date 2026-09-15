import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Decorative product still for a homepage chapter. Not a link.
 */
export function HomeChapterFigure({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-[var(--radius-artwork)] border border-line bg-panel">
        <Image
          src={src}
          alt={alt}
          width={1024}
          height={819}
          unoptimized
          className="h-auto w-full"
        />
      </div>
    </figure>
  );
}

const outlinedLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent";

const accentLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-accent px-3 text-xs font-semibold tracking-wide text-accent transition-opacity hover:opacity-90";

/** Copy on one side, still on the other. On small screens, copy stacks first. */
export function HomeChapterSplit({
  title,
  children,
  stillSrc,
  stillAlt,
  imageSide = "right",
  actions,
}: {
  title: string;
  children: ReactNode;
  stillSrc: string;
  stillAlt: string;
  imageSide?: "left" | "right";
  actions: Array<{ href: string; label: string; accent?: boolean }>;
}) {
  const copy = (
    <div className="min-w-0">
      <h3 className="m-0 font-display text-2xl tracking-wide text-ink sm:text-3xl">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted">
        {children}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={action.accent ? accentLinkClass : outlinedLinkClass}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid items-center gap-3 md:grid-cols-2 md:gap-4">
      <div
        className={
          imageSide === "left"
            ? "min-w-0 md:order-2"
            : "min-w-0 md:max-w-md md:justify-self-end"
        }
      >
        {copy}
      </div>
      <div className={imageSide === "left" ? "min-w-0 md:order-1" : "min-w-0"}>
        <HomeChapterFigure src={stillSrc} alt={stillAlt} />
      </div>
    </div>
  );
}
