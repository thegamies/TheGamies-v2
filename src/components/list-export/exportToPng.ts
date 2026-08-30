import type { CSSProperties } from "react";
import { toJpeg, toPng } from "html-to-image";
import {
  imageElementToDataUrl,
  loadCoverDataUrl,
  waitForAllImages,
  waitForImageLoad,
} from "./exportImageLoad";
import { isMobileDevice } from "./shareOrDownload";

export type ExportImageFormat = "png" | "jpeg";

export const EXPORT_JPEG_QUALITY = 0.92;

export function exportImageMimeType(format: ExportImageFormat): string {
  return format === "jpeg" ? "image/jpeg" : "image/png";
}

export function exportImageExtension(format: ExportImageFormat): string {
  return format === "jpeg" ? "jpg" : "png";
}

export function exportImageFilename(year: number, format: ExportImageFormat): string {
  return `goty-${year}.${exportImageExtension(format)}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  if (!base64) throw new Error("Invalid image data URL");
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function inlineCoverImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!(img instanceof HTMLImageElement)) return;

      const raw = img.currentSrc || img.getAttribute("src") || "";
      const dataUrl =
        (await imageElementToDataUrl(img)) ?? (await loadCoverDataUrl(raw));
      if (dataUrl && img.src !== dataUrl) {
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
        await waitForImageLoad(img);
      }
    }),
  );
}

async function renderToImage(
  node: HTMLElement,
  width: number,
  height: number,
  format: ExportImageFormat,
): Promise<Blob> {
  const mobile = isMobileDevice();
  const pixelRatio = mobile ? 1 : 2;
  const options = {
    width,
    height,
    pixelRatio,
    cacheBust: false,
    skipAutoScale: true,
    backgroundColor: format === "jpeg" ? "#000000" : undefined,
    quality: format === "jpeg" ? EXPORT_JPEG_QUALITY : undefined,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: "none",
      opacity: "1",
    },
  } as const;

  const encode = format === "jpeg" ? toJpeg : toPng;

  let lastError: unknown;
  for (const pr of pixelRatio === 1 ? [1] : [pixelRatio, 1]) {
    try {
      const dataUrl = await encode(node, { ...options, pixelRatio: pr });
      const blob = dataUrlToBlob(dataUrl);
      if (blob.size >= 256) return blob;
      lastError = new Error(`Image too small (${blob.size} bytes)`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Export failed");
}

/** Full-size export mount — rendered below the fold; never moved on-screen during capture. */
export function exportMountStyle(width: number, height: number): CSSProperties {
  return {
    position: "fixed",
    left: 0,
    top: "100vh",
    width,
    height,
    pointerEvents: "none",
    zIndex: -1,
    overflow: "visible",
  };
}

/**
 * Renders `node` to PNG or JPEG.
 * Inlines covers on a disposable clone so repeat exports don't strip covers from the live mount.
 */
export async function exportNodeToImage(
  node: HTMLElement,
  width: number,
  height: number,
  format: ExportImageFormat = "jpeg",
): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  await waitForAllImages(node);

  const host = document.createElement("div");
  Object.assign(host.style, exportMountStyle(width, height));
  host.setAttribute("aria-hidden", "true");
  const clone = node.cloneNode(true) as HTMLElement;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForAllImages(clone);
    await inlineCoverImages(clone);
    await waitForAllImages(clone);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    return await renderToImage(clone, width, height, format);
  } finally {
    host.remove();
  }
}
