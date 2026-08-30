import {
  type R2AvatarConfig,
  isJpegBytePayload,
  validateAvatarUploadInput,
} from "@/lib/profile/avatar-upload";

export function tgaNomineeObjectKey(year: number, nomineeId: string): string {
  return `tga/${year}/${nomineeId}.jpg`;
}

export function buildTgaNomineePublicUrl(
  publicBaseUrl: string,
  year: number,
  nomineeId: string,
): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${tgaNomineeObjectKey(year, nomineeId)}?v=${Date.now()}`;
}

export async function uploadTgaNomineeImageObject(
  config: R2AvatarConfig,
  input: { year: number; nomineeId: string; body: ArrayBuffer },
): Promise<{ imageUrl: string }> {
  if (!isJpegBytePayload(input.body)) {
    throw new Error("Photo must be a JPEG image.");
  }
  validateAvatarUploadInput({
    contentType: "image/jpeg",
    contentLength: input.body.byteLength,
  });

  const { AwsClient } = await import("aws4fetch");
  const objectKey = tgaNomineeObjectKey(input.year, input.nomineeId);
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
    headers: { "Content-Type": "image/jpeg" },
  });
  if (!response.ok) {
    throw new Error("Photo could not be saved.");
  }
  return {
    imageUrl: buildTgaNomineePublicUrl(
      config.publicBaseUrl,
      input.year,
      input.nomineeId,
    ),
  };
}
