import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { envAppOrigin } from "@/lib/seo/origin-env";
import { TGA_2025_OTHER_IMAGE_DIR } from "./other-image-seed";

const SAFE_FILE = /^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png)$/i;

export function tga2025OtherImagePublicPath(filename: string): string {
  return `/${TGA_2025_OTHER_IMAGE_DIR}/${filename}`;
}

export async function readTga2025OtherImageBytes(
  filename: string,
): Promise<ArrayBuffer | null> {
  if (!SAFE_FILE.test(filename)) return null;

  const diskPath = join(
    process.cwd(),
    "public",
    TGA_2025_OTHER_IMAGE_DIR,
    filename,
  );
  try {
    const buf = await readFile(diskPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    /* Workers often have no public/ on disk; fetch the deployed asset. */
  }

  const origin = envAppOrigin();
  if (!origin) return null;
  try {
    const res = await fetch(`${origin}${tga2025OtherImagePublicPath(filename)}`);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
