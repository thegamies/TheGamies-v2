import type { Metadata } from "next";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { IGDB_URL, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description: "How to reach The Gamies.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <SiteInfoLayout title="Contact" deck="We would love to hear from you">
      <p>
        Questions, feedback, bug reports, or account help: email us and we will
        get back to you as soon as we can.
      </p>
      <p>
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
      </p>
      <h2>Game data corrections</h2>
      <p>
        Missing titles, covers, and other catalog details are sourced from IGDB.
        Please fix those on{" "}
        <a href={IGDB_URL} target="_blank" rel="noopener noreferrer">
          IGDB.com
        </a>{" "}
        rather than emailing us about data errors.
      </p>
    </SiteInfoLayout>
  );
}
