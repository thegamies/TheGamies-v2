import type { Metadata } from "next";
import { Archivo, Bebas_Neue, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
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
    "Community Game of the Year awards, Voices, and personal ranked lists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bebas.variable} ${sourceSerif.variable} h-full`}
      // Cursor / remote preview injects attributes on <html>; ignore those.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink antialiased">
        <AppProviders>
          <SiteHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
