export const AVATAR_OUTPUT_SIZE = 400;

const AVATAR_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process that image."));
      },
      type,
      quality,
    );
  });
}

/** Center-crop to square and resize to `size`×`size`. Always outputs JPEG. */
export async function resizeAvatarImage(
  file: File,
  size = AVATAR_OUTPUT_SIZE,
): Promise<File> {
  if (!AVATAR_INPUT_TYPES.has(file.type)) {
    throw new Error("Photo must be a JPEG, PNG, or WebP image.");
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");

  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const cropSide = Math.min(srcW, srcH);
  const sx = (srcW - cropSide) / 2;
  const sy = (srcH - cropSide) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, sx, sy, cropSide, cropSide, 0, 0, size, size);

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (blob.size === 0) {
    throw new Error("Could not process that image.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
