import Image from "next/image";

type GameCoverProps = {
  title: string;
  imageUrl?: string | null;
  className?: string;
  priority?: boolean;
};

export function GameCover({
  title,
  imageUrl,
  className = "",
  priority = false,
}: GameCoverProps) {
  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-artwork)] border border-line bg-panel ${className}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          priority={priority}
          className="object-cover"
          sizes="(max-width: 640px) 40vw, 160px"
        />
      ) : (
        <div className="flex h-full w-full items-end p-3">
          <p className="font-display text-2xl leading-none tracking-wide text-muted">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
