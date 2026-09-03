import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/measurement";
import { GoogleAnalytics } from "./GoogleAnalytics";

describe("GoogleAnalytics", () => {
  it("emits Google’s head snippet in the initial HTML", () => {
    const html = renderToStaticMarkup(<GoogleAnalytics />);
    expect(html).toContain(
      `src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"`,
    );
    expect(html).toContain(" async");
    expect(html).toContain('id="ga-config"');
    expect(html).toContain(`gtag("config","${GA_MEASUREMENT_ID}"`);
    expect(html).not.toContain("afterInteractive");
  });
});
