/** Edit URL for an owned GOTY list opened from the existing-year preview. */
export function existingGotyEditHref(publicId: string): string {
  return `/create/goty?id=${encodeURIComponent(publicId)}`;
}

/** Create URL that shows the existing-year preview instead of the editor. */
export function existingGotyPreviewHref(publicId: string): string {
  return `/create/goty?id=${encodeURIComponent(publicId)}&existing=1`;
}
