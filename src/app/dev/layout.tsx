import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
