import Link from "@/lib/next-link";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/profile/UserAvatar";

export function ComparisonStripHeader({
  children,
  title,
  href,
  person,
}: {
  children: ReactNode;
  title?: string;
  href?: string | null;
  person?: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
}) {
  const labelClass = href
    ? "line-clamp-2 block w-full min-w-0 text-left text-sm font-semibold leading-snug text-ink underline-offset-2 transition-colors hover:text-accent hover:underline"
    : "line-clamp-2 block w-full min-w-0 text-left text-sm font-semibold leading-snug text-muted";

  const rowClass = "flex w-full min-w-0 items-center gap-2";
  const nameClass = `${labelClass} min-w-0`;

  if (!person) {
    return href ? (
      <Link href={href} className={labelClass} title={title}>
        {children}
      </Link>
    ) : (
      <span className={labelClass} title={title}>
        {children}
      </span>
    );
  }

  const avatar = (
    <UserAvatar
      displayName={person.displayName}
      username={person.username}
      avatarUrl={person.avatarUrl}
      size={22}
    />
  );

  if (href) {
    return (
      <Link href={href} className={rowClass} title={title}>
        {avatar}
        <span className={nameClass}>{children}</span>
      </Link>
    );
  }

  return (
    <div className={rowClass} title={title}>
      {avatar}
      <span className={nameClass}>{children}</span>
    </div>
  );
}
