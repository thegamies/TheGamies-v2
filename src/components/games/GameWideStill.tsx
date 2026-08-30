import Image from "next/image";

const FALLBACK_W = 16;
const FALLBACK_H = 9;

export function GameWideStill({
  title,
  imageUrl,
  width,
  height,
}: {
  title: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
}) {
  const intrinsicW =
    width != null && width > 0 && Number.isFinite(width) ? width : FALLBACK_W;
  const intrinsicH =
    height != null && height > 0 && Number.isFinite(height)
      ? height
      : FALLBACK_H;

  return (
    <div className="w-[280px] shrink-0 overflow-hidden border border-line bg-panel sm:w-[320px]">
      <Image
        src={imageUrl}
        alt={title}
        width={intrinsicW}
        height={intrinsicH}
        className="h-auto w-full"
        sizes="320px"
      />
    </div>
  );
}
