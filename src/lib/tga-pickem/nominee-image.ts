import {
  AVATAR_MAX_BYTES,
  type R2AvatarConfig,
  isJpegBytePayload,
  isPngBytePayload,
} from "@/lib/profile/avatar-upload";

export type TgaNomineeImageKind = {
  ext: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
};

export function detectTgaNomineeImageKind(
  body: ArrayBuffer,
): TgaNomineeImageKind | null {
  if (isJpegBytePayload(body)) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (isPngBytePayload(body)) {
    return { ext: "png", contentType: "image/png" };
  }
  return null;
}

export function tgaNomineeObjectKey(
  year: number,
  nomineeId: string,
  ext: "jpg" | "png" = "jpg",
): string {
  return `tga/${year}/${nomineeId}.${ext}`;
}

export function buildTgaNomineePublicUrl(
  publicBaseUrl: string,
  year: number,
  nomineeId: string,
  ext: "jpg" | "png" = "jpg",
): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${tgaNomineeObjectKey(year, nomineeId, ext)}?v=${Date.now()}`;
}

export async function uploadTgaNomineeImageObject(
  config: R2AvatarConfig,
  input: { year: number; nomineeId: string; body: ArrayBuffer },
): Promise<{ imageUrl: string }> {
  const kind = detectTgaNomineeImageKind(input.body);
  if (!kind) {
    throw new Error("Photo must be a JPEG or PNG image.");
  }
  if (input.body.byteLength > AVATAR_MAX_BYTES) {
    throw new Error("Photo must be 2MB or smaller.");
  }

  const { AwsClient } = await import("aws4fetch");
  const objectKey = tgaNomineeObjectKey(input.year, input.nomineeId, kind.ext);
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${objectKey}`;
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const bytes = new Uint8Array(input.body);
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  const response = await client.fetch(endpoint, {
    method: "PUT",
    body: payload,
    headers: { "Content-Type": kind.contentType },
  });
  if (!response.ok) {
    throw new Error("Photo could not be saved.");
  }
  return {
    imageUrl: buildTgaNomineePublicUrl(
      config.publicBaseUrl,
      input.year,
      input.nomineeId,
      kind.ext,
    ),
  };
}
