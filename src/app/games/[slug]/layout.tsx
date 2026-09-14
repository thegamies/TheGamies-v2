import type { ReactNode } from "react";
import { SiteAds } from "@/components/ads/AdsLayout";
import { getGamePageData } from "@/lib/catalog/game-public-value";

type Params = Promise<{ slug: string }>;

export default async function GameSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { slug } = await params;
  const data = await getGamePageData(slug).catch(() => null);
  const allowAds = Boolean(data?.hasPublicSiteValue);

  return (
    <>
      {allowAds ? <SiteAds forceBanner /> : null}
      {children}
    </>
  );
}
