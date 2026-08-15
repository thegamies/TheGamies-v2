/** Edit URL for an owned GOTY list opened from the existing-year preview. */
export function existingGotyEditHref(publicId: string): string {
  return `/create/goty?id=${encodeURIComponent(publicId)}`;
}

/** Year-picker page with existing-list preview for that year (same page). */
export function existingGotyPreviewHref(year: number): string {
  return `/create/goty?year=${encodeURIComponent(String(year))}`;
}
