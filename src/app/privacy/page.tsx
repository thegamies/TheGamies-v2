import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { PRIVACY_EMAIL, PRIVACY_MAILTO } from "@/lib/site";

const EFFECTIVE_DATE = "August 31, 2026";

import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Privacy Policy",
  description: "Privacy Policy for The Gamies.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <SiteInfoLayout
      title="Privacy Policy"
      deck={`Effective Date: ${EFFECTIVE_DATE}`}
    >
      <p>
        Welcome to The Gamies (&quot;The Gamies,&quot; &quot;we,&quot;
        &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains what
        information we collect, how we use it, and when it may be shared when
        you use our website and services.
      </p>
      <h2>Information We Collect</h2>
      <p>
        We collect information you choose to provide when creating an account,
        using The Gamies, or contacting us. This may include information
        associated with your account, profile, and the content you create or
        share.
      </p>
      <p>
        We also collect limited technical and usage information, such as your IP
        address, browser and device information, pages visited, and other
        diagnostic data to help operate, secure, and improve The Gamies.
      </p>
      <h2>How We Use Information</h2>
      <p>
        We use your information to operate The Gamies, manage and secure your
        account, provide requested features, improve the service, communicate
        with you about your account, and comply with legal obligations.
      </p>
      <h2>Public Information</h2>
      <p>
        The Gamies is a community platform. Information you choose to make
        public, such as your profile, Game of the Year lists, and social
        activity, may be visible to other users and visitors.
      </p>
      <p>
        Please avoid sharing personal information that you do not want to be
        publicly available.
      </p>
      <h2>Sharing Information</h2>
      <p>
        We may share information with service providers that help us operate The
        Gamies, when required by law, to protect our users or rights, or as part
        of a business transaction such as a merger or acquisition.
      </p>
      <p>We do not sell your personal information.</p>
      <h2 id="cookies">Cookies, Analytics, and Ads</h2>
      <p>
        We use essential cookies to keep you signed in, remember your
        preferences, and help secure The Gamies. Those stay on even if you
        reject non-essential cookies.
      </p>
      <p>
        We use Google Analytics to collect aggregated usage information. That
        usage data is collected in a cookieless form even if you have not
        accepted analytics cookies. If you accept, additional analytics cookies
        help us understand return visits more accurately.
      </p>
      <p>
        We use Google AdSense to show ads on The Gamies. If you accept
        non-essential cookies, advertising cookies may be used to show more
        relevant ads. If you reject, ads may still appear in a less
        personalized form. Google may collect information as described in
        Google&apos;s advertising policies.
      </p>
      <p>
        Visitors in the European Economic Area, the United Kingdom, and
        Switzerland also see Google&apos;s consent message for ads. That
        message is required for personalized advertising in those regions. You
        can change that ads choice later from Ad privacy in the site footer.
      </p>
      <p>
        You can Accept or Reject non-essential cookies in the prompt on The
        Gamies. You can also control cookies through your browser settings,
        although some features may not function properly if essential cookies
        are disabled.
      </p>
      <h2>Account Deletion</h2>
      <p>
        You can delete your account through your account settings. That removes
        your profile, lists, community memberships, and ballots that are still
        open. Published community ceremonies may keep an anonymized voter line
        with no name and no profile. Some information may also be retained where
        required by law or as reasonably necessary to protect the security and
        integrity of The Gamies.
      </p>
      <h2>Children&apos;s Privacy</h2>
      <p>
        The Gamies is not intended for children under the age of 13, and we do
        not knowingly collect personal information from children under 13.
      </p>
      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will
        update the Effective Date above.
      </p>
      <h2>Contact</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at{" "}
        <a href={PRIVACY_MAILTO}>{PRIVACY_EMAIL}</a>. See also our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </SiteInfoLayout>
  );
}
