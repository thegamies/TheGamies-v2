import { permanentRedirect } from "next/navigation";
import { legacyGameIndexHref } from "@/lib/seo/legacy-game-redirect";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Legacy catalog index: `/game` → `/games` (old site + Google indexes). */
export default async function LegacyGameIndexRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  permanentRedirect(legacyGameIndexHref(await searchParams));
}
