"use client";

import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";

export { useLinkStatus } from "next/link";

type LinkProps = ComponentProps<typeof NextLink>;

/**
 * App Router `Link` with prefetch off, so a viewport of game covers cannot
 * run destination Server Components. Import this, never `next/link`.
 */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { prefetch = false, ...props },
  ref,
) {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default Link;
