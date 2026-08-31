export type AuthUserIdentity = {
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
}

/** Name, email, and photo from Neon / Google on the Auth user object. */
export function identityFromAuthUser(user: unknown): AuthUserIdentity {
  if (!user || typeof user !== "object") {
    return { name: null, email: null, imageUrl: null };
  }
  const record = user as Record<string, unknown>;
  return {
    name: firstNonEmptyString(record.name, record.displayName),
    email: firstNonEmptyString(record.email),
    imageUrl: httpsUrl(record.image) ?? httpsUrl(record.picture),
  };
}
