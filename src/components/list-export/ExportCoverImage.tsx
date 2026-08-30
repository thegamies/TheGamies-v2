import { useState, type CSSProperties } from "react";
import { exportCoverUrl } from "./exportCoverUrl";

const FALLBACK_BG = "#1a1a1c";

/** Cover art for export layouts; `crossOrigin` helps html-to-image when remotes send CORS headers. */
export function ExportCoverImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const resolvedSrc = exportCoverUrl(src);
  return (
    <ExportCoverImageInner
      key={resolvedSrc || "empty"}
      resolvedSrc={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
    />
  );
}

function ExportCoverImageInner({
  resolvedSrc,
  alt,
  className,
  style,
}: {
  resolvedSrc: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !resolvedSrc) {
    return (
      <div
        className={className}
        style={{ ...style, backgroundColor: FALLBACK_BG }}
        aria-hidden={!alt}
        title={alt}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      crossOrigin="anonymous"
      loading="eager"
      decoding="sync"
      className={className}
      style={style}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
