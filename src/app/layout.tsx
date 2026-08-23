import type { Metadata, Viewport } from "next";
import { Archivo, Bebas_Neue, Source_Serif_4 } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CookieConsentBanner } from "@/components/analytics/CookieConsentBanner";
import { AppProviders } from "@/components/AppProviders";
import { NavigationProgress } from "@/components/NavigationProgress";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ogImagePath } from "@/lib/seo/og-path";
import { appOrigin, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
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

const origin = appOrigin();

export const metadata: Metadata = {
  metadataBase: origin ? new URL(origin) : undefined,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
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
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bebas.variable} ${sourceSerif.variable} min-h-full`}
      // Cursor / remote preview injects attributes on <html>; ignore those.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink antialiased">
        <NavigationProgress />
        <AppProviders>
          <SiteHeader />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <SiteFooter />
          <GoogleAnalytics />
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
