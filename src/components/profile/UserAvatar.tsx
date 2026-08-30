export function UserAvatar({
  displayName,
  username,
  avatarUrl,
  size = 80,
  className = "",
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (displayName.trim() || username).slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-panel font-display tracking-wide text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
