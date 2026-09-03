import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT_ID } from "@/lib/ads/adsense";
import { GoogleAdSense } from "./GoogleAdSense";

describe("GoogleAdSense", () => {
  it("emits Funding Choices then Google’s head snippet", () => {
    const html = renderToStaticMarkup(<GoogleAdSense />);
    expect(html).toContain(
      'src="https://fundingchoicesmessages.google.com/i/pub-9835884276920090.js?ers=1"',
    );
    expect(html).toContain("googlefcPresent");
    expect(html).toContain(
      `src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}"`,
    );
    expect(html).toContain(" async");
    expect(html.toLowerCase()).toContain('crossorigin="anonymous"');
    expect(html.indexOf("fundingchoicesmessages")).toBeLessThan(
      html.indexOf("adsbygoogle.js"),
    );
  });

  it("omits the snippet when ads are not allowed on the page", () => {
    expect(renderToStaticMarkup(<GoogleAdSense enabled={false} />)).toBe("");
  });
});
