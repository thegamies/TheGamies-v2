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

export type ListShareView = "goty" | "categories";

export function parseListShareView(raw: unknown): ListShareView {
  return raw === "categories" ? "categories" : "goty";
}

/** Public GOTY list tabs (`?view=categories`). Default is Game of the Year. */
export function listShareViewHref(
  path: string,
  opts: {
    view?: ListShareView;
    saved?: boolean;
    error?: string | null;
  } = {},
) {
  const params = new URLSearchParams();
  if (opts.view === "categories") {
    params.set("view", "categories");
  }
  if (opts.saved) {
    params.set("saved", "1");
  }
  if (opts.error) {
    params.set("error", opts.error);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Append or drop `view=categories` on an existing href (e.g. Edit → create). */
export function withListShareView(href: string, view: ListShareView): string {
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const search = qIndex === -1 ? "" : href.slice(qIndex + 1);
  const params = new URLSearchParams(search);
  if (view === "categories") {
    params.set("view", "categories");
  } else {
    params.delete("view");
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
