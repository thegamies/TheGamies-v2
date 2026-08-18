export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 400;

export const AVATAR_ALLOWED_CONTENT_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type R2AvatarConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

export function avatarObjectKey(profileId: string): string {
  return `avatars/${profileId}/avatar.jpg`;
}

export function userAvatarObjectKeys(profileId: string): string[] {
  return [
    `avatars/${profileId}/avatar.jpg`,
    `avatars/${profileId}/avatar.jpeg`,
    `avatars/${profileId}/avatar.png`,
    `avatars/${profileId}/avatar.webp`,
  ];
}

export function buildAvatarPublicUrl(
  publicBaseUrl: string,
  profileId: string,
): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/avatars/${profileId}/avatar.jpg`;
}

export function isJpegBytePayload(body: ArrayBuffer): boolean {
  const bytes = new Uint8Array(body);
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function validateAvatarUploadInput(input: {
  contentType: string;
  contentLength: number;
}): void {
  const type = input.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (type !== "image/jpeg" && type !== "image/jpg") {
    throw new Error("Photo must be a JPEG image.");
  }

  if (!Number.isFinite(input.contentLength) || input.contentLength <= 0) {
    throw new Error("Photo file size is required.");
  }

  if (input.contentLength > AVATAR_MAX_BYTES) {
    throw new Error("Photo must be 2MB or smaller.");
  }
}

export function readR2AvatarConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): R2AvatarConfig | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_AVATAR_BUCKET?.trim();
  const publicBaseUrl = env.AVATAR_PUBLIC_BASE_URL?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

async function putAvatarObject(
  config: R2AvatarConfig,
  objectKey: string,
  body: Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { AwsClient } = await import("aws4fetch");

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${objectKey}`;
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  const response = await client.fetch(endpoint, {
    method: "PUT",
    body: payload,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!response.ok) {
    throw new Error("Photo could not be saved.");
  }
}

async function deleteAvatarObjects(
  config: R2AvatarConfig,
  profileId: string,
): Promise<void> {
  const { AwsClient } = await import("aws4fetch");

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  for (const objectKey of userAvatarObjectKeys(profileId)) {
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${objectKey}`;
    try {
      const response = await client.fetch(endpoint, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("Photo could not be removed.");
      }
    } catch {
      // Best-effort cleanup.
    }
  }
}

export async function uploadAvatarObject(
  config: R2AvatarConfig,
  input: { profileId: string; contentType: string; body: ArrayBuffer },
): Promise<{ avatarUrl: string }> {
  if (!isJpegBytePayload(input.body)) {
    throw new Error("Photo must be a JPEG image.");
  }

  validateAvatarUploadInput({
    contentType: "image/jpeg",
    contentLength: input.body.byteLength,
  });

  const objectKey = avatarObjectKey(input.profileId);
  await putAvatarObject(config, objectKey, new Uint8Array(input.body), "image/jpeg");

  return {
    avatarUrl: `${buildAvatarPublicUrl(config.publicBaseUrl, input.profileId)}?v=${Date.now()}`,
  };
}

export async function deleteUserAvatarObjects(
  config: R2AvatarConfig,
  profileId: string,
): Promise<void> {
  await deleteAvatarObjects(config, profileId);
}
