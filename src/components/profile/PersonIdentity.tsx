import Link from "next/link";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/profile/UserAvatar";

/** Avatar + name for people lists. Initials when there is no photo. Not a chip. */
export function PersonIdentity({
  displayName,
  username,
  avatarUrl,
  size = 36,
  href,
  lede,
  nameSuffix,
  nameClassName = "text-ink",
  subtitle,
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  size?: number;
  href?: string;
  /** Quiet prefix on the name line, e.g. “By”. */
  lede?: string;
  nameSuffix?: string;
  nameClassName?: string;
  /** `undefined` shows @username. `null` hides the second line. */
  subtitle?: ReactNode | null;
}) {
  const name = (
    <>
      {lede ? <span className="text-muted">{lede} </span> : null}
      {displayName}
      {nameSuffix}
    </>
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl}
        size={size}
      />
      <div className="min-w-0">
        {href ? (
          <Link href={href} className={`${nameClassName} hover:text-accent`}>
            {name}
          </Link>
        ) : (
          <p className={nameClassName}>{name}</p>
        )}
        {subtitle === undefined ? (
          <p className="truncate text-sm text-muted">@{username}</p>
        ) : (
          subtitle
        )}
      </div>
    </div>
  );
}
