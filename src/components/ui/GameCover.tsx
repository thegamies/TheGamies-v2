import Image from "next/image";

type GameCoverProps = {
  title: string;
  imageUrl?: string | null;
  className?: string;
  priority?: boolean;
  /**
   * Intrinsic / srcset hint. With `fluid`, used for Image `sizes` only;
   * box is width-full at cover ratio.
   */
  width?: number;
  height?: number;
  /** Fill parent width at 3:4 instead of fixed pixel box. */
  fluid?: boolean;
};

export function GameCover({
  title,
  imageUrl,
  className = "",
  priority = false,
  width,
  height,
  fluid = false,
}: GameCoverProps) {
  const fixed = !fluid && width != null && height != null;

  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-artwork)] border border-line bg-panel ${
        fixed ? "" : "aspect-[3/4] w-full"
      } ${className}`}
      style={fixed ? { width, height } : undefined}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          priority={priority}
          draggable={false}
          className="pointer-events-none object-cover"
          sizes={
            fixed
              ? `${width}px`
              : width != null
                ? `(max-width: 640px) 40vw, ${width}px`
                : "(max-width: 640px) 40vw, 160px"
          }
        />
      ) : (
        <div className="flex h-full w-full items-end p-2 sm:p-3">
          <p
            className={`font-display leading-none tracking-wide text-muted ${
              fixed && width != null && width < 140
                ? "text-sm"
                : "text-lg sm:text-2xl"
            }`}
          >
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
