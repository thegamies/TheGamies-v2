import type { ReactNode } from "react";
import { AboutSectionNav } from "@/components/about/AboutSectionNav";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";

export function AboutInfoLayout({
  title,
  deck,
  children,
}: {
  title: string;
  deck?: string;
  children: ReactNode;
}) {
  return (
    <SiteInfoLayout title={title} deck={deck} subnav={<AboutSectionNav />}>
      {children}
    </SiteInfoLayout>
  );
}
