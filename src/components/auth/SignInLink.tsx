"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import {
  buildSignInHref,
  returnPathFromLocation,
} from "@/lib/auth/return-to";

type SignInLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  children?: ReactNode;
};

/** Sign in that returns the user to the current page after auth. */
export function SignInLink({ children = "Sign in", ...props }: SignInLinkProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const next = returnPathFromLocation(pathname, searchParams.toString());
  return (
    <Link href={buildSignInHref({ next })} {...props}>
      {children}
    </Link>
  );
}
