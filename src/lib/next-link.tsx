"use client";

import NextLink from "next/dist/client/app-dir/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export { useLinkStatus } from "next/dist/client/app-dir/link";

type LinkProps = ComponentPropsWithoutRef<typeof NextLink>;

/**
 * App Router `Link` with prefetch off. `next/link` is aliased here so a
 * viewport of game covers cannot run destination Server Components.
 */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { prefetch = false, ...props },
  ref,
) {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default Link;
