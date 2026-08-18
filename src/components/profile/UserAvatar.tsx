export function UserAvatar({
  displayName,
  username,
  avatarUrl,
  size = 80,
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  size?: number;
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
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border border-line bg-panel font-display tracking-wide text-ink"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
