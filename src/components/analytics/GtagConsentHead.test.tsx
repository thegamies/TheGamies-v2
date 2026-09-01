import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ADS_CONSENT_WAIT_MS } from "@/lib/analytics/gtag";
import { GtagConsentHead } from "./GtagConsentHead";

describe("GtagConsentHead", () => {
  it("defaults consent in the document head before ads", () => {
    const html = renderToStaticMarkup(<GtagConsentHead />);
    expect(html).toContain("gtag(\"consent\",\"default\"");
    expect(html).toContain(`wait_for_update:${ADS_CONSENT_WAIT_MS}`);
  });
});
