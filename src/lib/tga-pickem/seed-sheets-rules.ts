export const SEED_TGA_MAX_BATCH = 50;
export const SEED_TGA_INSERT_CHUNK = 200;

export function tgaCommunitySeedSlugError(slug: string): string | null {
  return slug.trim() ? null : "Enter a community slug.";
}
