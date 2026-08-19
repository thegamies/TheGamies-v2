import type { Metadata, Viewport } from "next";
import { Archivo, Bebas_Neue, Source_Serif_4 } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CookieConsentBanner } from "@/components/analytics/CookieConsentBanner";
import { AppProviders } from "@/components/AppProviders";
import { NavigationProgress } from "@/components/NavigationProgress";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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

export const metadata: Metadata = {
  title: {
    default: "The Gamies",
    template: "%s · The Gamies",
  },
  description:
    "Community Game of the Year awards, Hosts, and personal ranked lists.",
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
