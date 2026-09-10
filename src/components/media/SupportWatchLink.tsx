import {
  isSupportVideoParseOk,
  parseSupportVideoLink,
} from "@/lib/media/support-video-link";

export function SupportWatchLink({
  url,
  className = "mt-2 inline-block text-sm text-ink underline-offset-4 hover:underline",
}: {
  url: string;
  className?: string;
}) {
  const parsed = parseSupportVideoLink(url);
  if (!isSupportVideoParseOk(parsed)) return null;
  return (
    <a
      href={parsed.canonicalUrl}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      Watch
    </a>
  );
}
