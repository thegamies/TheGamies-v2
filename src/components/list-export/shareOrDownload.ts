export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform))
  );
}

/** Web Share API is available. */
export function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Opens the system share sheet with the image file.
 * On iPhone/Android that sheet includes Save Image / Photos when files are shared.
 */
export async function shareImageFile(
  blob: Blob,
  filename: string,
  _title: string,
  mimeType = blob.type || "image/jpeg",
): Promise<void> {
  if (navigator.share) {
    const file = new File([blob], filename, { type: mimeType });
    const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
    if (canShareFiles) {
      await navigator.share({ files: [file] });
      return;
    }
  }
  downloadBlob(filename, blob);
}

/** True when this page is allowed to use clipboard APIs (HTTPS / localhost). */
export function isSecureClipboardContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

/** True when the Clipboard API can accept an image. */
export function canCopyImage(): boolean {
  if (!isSecureClipboardContext()) return false;
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) return false;
  return typeof ClipboardItem !== "undefined";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for clipboard"));
    img.src = url;
  });
}

/** Most browsers only accept PNG on the clipboard — re-encode JPEG exports first. */
async function blobAsClipboardPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    ctx.drawImage(img, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((encoded) => {
        if (!encoded) {
          reject(new Error("Could not encode image for clipboard"));
          return;
        }
        resolve(encoded);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Copy a rendered page image (e.g. preview <img src="blob:...">) via Clipboard API.
 * Fetches the image URL → Blob → clipboard.write (PNG), with a Promise payload for Safari.
 */
export async function copyImageElementToClipboard(
  img: HTMLImageElement,
): Promise<void> {
  if (!canCopyImage()) throw new Error("Clipboard image copy is not available");

  const src = img.currentSrc || img.src;
  if (!src) throw new Error("Image has no src to copy");

  const pngPromise = (async () => {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
    const blob = await response.blob();
    return blobAsClipboardPng(blob);
  })();

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": pngPromise }),
  ]);
}

/**
 * Saves an image. On phone, prefers the share sheet so the user can pick
 * "Save Image" / Photos. Desktop downloads the file.
 */
export async function saveImageBlob(
  blob: Blob,
  filename: string,
  _title?: string,
  mimeType = blob.type || "image/jpeg",
): Promise<"shared" | "downloaded"> {
  if (isMobileDevice() && canUseWebShare()) {
    const file = new File([blob], filename, { type: mimeType });
    const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (e) {
        if ((e as DOMException).name === "AbortError") throw e;
      }
    }
  }
  downloadBlob(filename, blob);
  return "downloaded";
}
