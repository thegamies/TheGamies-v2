import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  description?: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
};

/** Banner tile used on My Communities and profile Communities tabs. */
export function CommunityListCard({
  slug,
  name,
  description,
  avatarUrl,
  bannerUrl,
  memberCount,
}: Props) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <li className="min-w-0">
      <Link href={`/communities/${slug}`} className="group block">
        <div className="relative overflow-hidden bg-panel">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt=""
              className="aspect-[5/2] max-h-40 w-full object-cover sm:max-h-48"
            />
          ) : (
            <div
              className="aspect-[5/2] max-h-40 w-full bg-panel sm:max-h-48"
              aria-hidden
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-20% via-paper/40 via-55% to-paper to-100%"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3 pt-10 font-display text-xl tracking-wide text-ink transition-colors group-hover:text-accent sm:text-2xl">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-base"
                aria-hidden
              >
                {initial}
              </span>
            )}
            <span className="min-w-0 truncate pb-0.5">{name}</span>
          </div>
        </div>
      </Link>
      <p className="mt-1.5 text-sm text-muted">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </p>
      {description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted">{description}</p>
      ) : null}
    </li>
  );
}
