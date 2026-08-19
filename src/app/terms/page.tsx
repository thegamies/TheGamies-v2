import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoLayout } from "@/components/SiteInfoLayout";
import { TERMS_EMAIL, TERMS_MAILTO } from "@/lib/site";

const EFFECTIVE_DATE = "August 19, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <SiteInfoLayout
      title="Terms of Service"
      deck={`Effective Date: ${EFFECTIVE_DATE}`}
    >
      <p>
        Welcome to The Gamies (&quot;The Gamies,&quot; &quot;we,&quot;
        &quot;our,&quot; or &quot;us&quot;). By accessing or using The Gamies,
        you agree to these Terms of Service.
      </p>
      <h2>Eligibility</h2>
      <p>You must be at least 13 years old to use The Gamies.</p>
      <h2>Your Account</h2>
      <p>
        You are responsible for your account and for keeping your login
        credentials secure. Notify us if you believe your account has been
        compromised.
      </p>
      <h2>Your Content</h2>
      <p>You retain ownership of the content you submit to The Gamies.</p>
      <p>
        By submitting content, you grant The Gamies a worldwide, non-exclusive,
        royalty-free license to host, store, display, reproduce, distribute, and
        otherwise use your content as necessary to operate, improve, and promote
        the service.
      </p>
      <p>
        You are responsible for the content you submit and must have the right
        to share it.
      </p>
      <h2>Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break any applicable laws.</li>
        <li>Infringe another person&apos;s intellectual property.</li>
        <li>Harass, threaten, impersonate, or abuse other users.</li>
        <li>Upload malicious software or attempt to disrupt the service.</li>
        <li>
          Create fake accounts, spam, or use automated methods to manipulate
          rankings or other community features.
        </li>
      </ul>
      <h2>Moderation</h2>
      <p>
        We may investigate activity that appears intended to manipulate rankings,
        votes, or other community features.
      </p>
      <p>
        We may remove content, restrict features, suspend accounts, or
        permanently ban users who violate these Terms or our{" "}
        <Link href="/guidelines">Community Guidelines</Link>.
      </p>
      <h2>Service Availability</h2>
      <p>
        We may modify, suspend, or discontinue all or part of The Gamies at any
        time. We are not responsible for interruptions, technical issues, or
        temporary unavailability.
      </p>
      <h2>Intellectual Property</h2>
      <p>
        The Gamies, including its software, branding, and original content, is
        owned by The Gamies or its licensors.
      </p>
      <p>
        Game titles, artwork, trademarks, and other third-party content remain
        the property of their respective owners.
      </p>
      <h2>Disclaimer</h2>
      <p>
        The Gamies is provided &quot;as is&quot; and &quot;as available.&quot;
        We do not guarantee that the service will always be available, accurate,
        or error-free.
      </p>
      <p>
        Content created by users reflects their own opinions and not necessarily
        those of The Gamies.
      </p>
      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, The Gamies and its owners will
        not be liable for any indirect, incidental, special, consequential, or
        punitive damages arising from your use of the service.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of The Gamies
        after changes become effective constitutes acceptance of the updated
        Terms.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these Terms may be sent to{" "}
        <a href={TERMS_MAILTO}>{TERMS_EMAIL}</a>. See also our{" "}
        <Link href="/guidelines">Community Guidelines</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </SiteInfoLayout>
  );
}
