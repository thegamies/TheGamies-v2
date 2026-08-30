import { exportCoverFallbackUrls } from "./exportCoverUrl";

export function resolveExportAssetUrl(src: string): string {
  if (!src || src.startsWith("data:")) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (typeof window !== "undefined") {
    try {
      return new URL(src, window.location.origin).href;
    } catch {
      return src;
    }
  }
  return src;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

export async function fetchExportAssetAsDataUrl(
  pathOrUrl: string,
): Promise<string | null> {
  try {
    const url = resolveExportAssetUrl(pathOrUrl);
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) return null;
    return await blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

export function waitForImageLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

export async function imageElementToDataUrl(
  img: HTMLImageElement,
): Promise<string | null> {
  await waitForImageLoad(img);
  if (!img.naturalWidth) return null;
  if (img.src.startsWith("data:")) return img.src;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const mime = img.src.includes(".png") ? "image/png" : "image/jpeg";
    return canvas.toDataURL(mime, 0.92);
  } catch {
    return null;
  }
}

export async function loadCoverDataUrl(src: string): Promise<string | null> {
  const resolved = resolveExportAssetUrl(src);
  if (!resolved || resolved.startsWith("data:")) return resolved || null;

  for (const attempt of exportCoverFallbackUrls(resolved).map(
    resolveExportAssetUrl,
  )) {
    const viaCanvas = await new Promise<string | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        void imageElementToDataUrl(image).then(resolve);
      };
      image.onerror = () => resolve(null);
      image.src = attempt;
    });
    if (viaCanvas) return viaCanvas;

    const fetched = await fetchExportAssetAsDataUrl(attempt);
    if (fetched) return fetched;
  }
  return null;
}

export async function waitForAllImages(root: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(async (img) => {
      if (!(img instanceof HTMLImageElement)) return;
      await waitForImageLoad(img);
      try {
        await img.decode();
      } catch {
        // ignore
      }
    }),
  );
}
