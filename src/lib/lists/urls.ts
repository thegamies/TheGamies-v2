export function listSharePath(input: {
  publicId: string;
  slug?: string | null;
  username?: string | null;
}): string {
  if (input.username && input.slug) {
    return `/u/${input.username}/${input.slug}`;
  }
  return `/l/${input.publicId}`;
}
