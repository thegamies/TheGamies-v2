import { validatePassword } from "@/lib/auth/password";

/**
 * Synthetic QA identities for signed-in staging checks. Emails use a reserved
 * domain so no mail is ever delivered (see `isUndeliverableEmailAddress`).
 */
export const QA_ACCOUNTS = {
  host: {
    email: "thegamies-qa-host@example.com",
    username: "gamies_qa_host",
    displayName: "QA Host",
  },
  member: {
    email: "thegamies-qa-member@example.com",
    username: "gamies_qa_member",
    displayName: "QA Member",
  },
  outsider: {
    email: "thegamies-qa-outsider@example.com",
    username: "gamies_qa_outsider",
    displayName: "QA Outsider",
  },
} as const;

export type QaAccountKey = keyof typeof QA_ACCOUNTS;
export const QA_ACCOUNT_KEYS = Object.keys(QA_ACCOUNTS) as QaAccountKey[];

/** Names slugify to these exact slugs; a suffixed slug means someone else owns the name. */
export const QA_COMMUNITIES = {
  private: {
    name: "Gamies QA Private",
    slug: "gamies_qa_private",
    description: "Automated staging checks. Not a real community.",
    visibility: "private",
    joinsClosed: false,
  },
  showcase: {
    name: "Gamies QA Showcase",
    slug: "gamies_qa_showcase",
    description: "Automated staging checks. Not a real community.",
    visibility: "public",
    joinsClosed: true,
  },
} as const;

export type QaCommunityKey = keyof typeof QA_COMMUNITIES;

export const QA_EDITION_YEAR_DEFAULT = 2025;
export const QA_SEED_BALLOTS = 8;

/** Written by the fixture script, read by the staging Playwright specs. */
export type QaFixturesFile = {
  year: number;
  communities: Record<QaCommunityKey, { slug: string; categoryId: string }>;
};

const PRODUCTION_HOSTS = new Set(["thegamies.gg", "www.thegamies.gg"]);

export function isProductionAppHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PRODUCTION_HOSTS.has(host) || /^thegamies-v2\.[^.]+\.workers\.dev$/.test(host);
}

export type QaTarget = {
  appUrl: string;
  databaseUrl: string;
  password: string;
  year: number;
};

/** Refuse anything that is not explicitly staging. Never echoes secret values. */
export function resolveQaTarget(
  env: Record<string, string | undefined>,
): QaTarget | { error: string } {
  if (env.QA_TARGET !== "staging") {
    return { error: "QA_TARGET must be set to staging." };
  }

  const rawUrl = env.QA_STAGING_URL?.trim();
  if (!rawUrl) return { error: "QA_STAGING_URL is required." };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "QA_STAGING_URL is not a valid URL." };
  }
  if (url.protocol !== "https:") {
    return { error: "QA_STAGING_URL must use https." };
  }
  if (isProductionAppHost(url.hostname)) {
    return { error: "QA_STAGING_URL points at production." };
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) return { error: "DATABASE_URL is required." };

  const password = env.QA_ACCOUNT_PASSWORD ?? "";
  if (!validatePassword(password).ok) {
    return {
      error:
        "QA_ACCOUNT_PASSWORD must be 8+ characters with a letter and a number.",
    };
  }

  const yearRaw = env.QA_EDITION_YEAR?.trim();
  const year = yearRaw ? Number(yearRaw) : QA_EDITION_YEAR_DEFAULT;
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    return { error: "QA_EDITION_YEAR must be a year." };
  }

  return { appUrl: url.origin, databaseUrl, password, year };
}
