export const SUPPORT_EMAIL = "hello@thegamies.gg";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const PRIVACY_EMAIL = "privacy@thegamies.gg";
export const PRIVACY_MAILTO = `mailto:${PRIVACY_EMAIL}`;
export const TERMS_EMAIL = "support@thegamies.gg";
export const TERMS_MAILTO = `mailto:${TERMS_EMAIL}`;

export const IGDB_URL = "https://www.igdb.com/";

export const SITE_INFO_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export const SITE_SOCIAL_LINKS = [
  { key: "discord" as const, label: "Discord", href: "https://discord.gg/r9Gvj4Fua" },
  { key: "x" as const, label: "X", href: "https://x.com/TheGamiesgg" },
  { key: "bluesky" as const, label: "Bluesky", href: "https://bsky.app/profile/thegamies.gg" },
];
