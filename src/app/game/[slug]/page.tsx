import { permanentRedirect } from "next/navigation";
import { legacyGameSlugHref } from "@/lib/seo/legacy-game-redirect";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Legacy game detail: `/game/[slug]` → `/games/[slug]` (old site + Google indexes). */
export default async function LegacyGameSlugRedirectPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  permanentRedirect(legacyGameSlugHref(slug, await searchParams));
}
