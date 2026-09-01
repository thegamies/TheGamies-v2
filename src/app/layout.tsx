import type { Metadata, Viewport } from "next";
import { Archivo, Bebas_Neue, Source_Serif_4 } from "next/font/google";
import { GoogleAdSense } from "@/components/ads/GoogleAdSense";
import { SiteAdBanner } from "@/components/ads/SiteAdBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CookieConsentBanner } from "@/components/analytics/CookieConsentBanner";
import { AppProviders } from "@/components/AppProviders";
import { NavigationProgress } from "@/components/NavigationProgress";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAdsenseBannerSlot, getAdsenseClientId } from "@/lib/ads/adsense";
import { ogImagePath } from "@/lib/seo/og-path";
import { resolvePublicOrigin } from "@/lib/seo/origin";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const origin = await resolvePublicOrigin();
  let metadataBase: URL | undefined;
  if (origin) {
    try {
      metadataBase = new URL(origin);
    } catch {
      metadataBase = undefined;
    }
  }
  const adsenseClient = getAdsenseClientId();
  return {
    metadataBase,
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    ...(adsenseClient
      ? { other: { "google-adsense-account": adsenseClient } }
      : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [{ url: ogImagePath({ kind: "default" }), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [ogImagePath({ kind: "default" })],
    },
  };
}

/** Keep iOS Safari on a real phone width (no ~980px desktop layout). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showSiteAd = Boolean(getAdsenseClientId() && getAdsenseBannerSlot());
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bebas.variable} ${sourceSerif.variable}${showSiteAd ? " has-site-ad" : ""}`}
      // Cursor / remote preview injects attributes on <html>; ignore those.
      suppressHydrationWarning
    >
      <head>
        <GoogleAdSense />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        <NavigationProgress />
        <AppProviders>
          <div className="site-shell">
            <SiteHeader />
            <div className="site-main">{children}</div>
            <SiteFooter />
            <SiteAdBanner />
          </div>
          <GoogleAnalytics />
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
