import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { PRIVACY_EMAIL, PRIVACY_MAILTO } from "@/lib/site";

const EFFECTIVE_DATE = "July 13, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

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
      <h2>Cookies and Analytics</h2>
      <p>
        We use cookies to keep you signed in, remember your preferences, improve
        security, and understand how The Gamies is used.
      </p>
      <p>
        We also use Google Analytics to collect aggregated usage information
        that helps us improve the website and understand how visitors use our
        services.
      </p>
      <p>
        You can control or disable cookies through your browser settings,
        although some features of The Gamies may not function properly if
        cookies are disabled.
      </p>
      <h2>Account Deletion</h2>
      <p>
        You can delete your account through your account settings. Some
        information may be retained where required by law or as reasonably
        necessary to protect the security and integrity of The Gamies.
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
