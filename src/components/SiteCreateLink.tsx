import Link from "next/link";
import { SITE_CREATE_HREF, siteCreateLinkClass } from "@/lib/site-nav";

export function SiteCreateLink({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={SITE_CREATE_HREF}
      className={`${siteCreateLinkClass} ${className}`.trim()}
      onClick={onClick}
    >
      + Create
    </Link>
  );
}
