import { renderToStaticMarkup } from "react-dom/server";
import type { ScriptHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { ADSENSE_CLIENT_ID, adsbygoogleScriptSrc } from "@/lib/ads/adsense";
import { GoogleAdSense } from "./GoogleAdSense";

vi.mock("next/script", () => ({
  default: function Script(
    props: ScriptHTMLAttributes<HTMLScriptElement> & {
      strategy?: string;
      onLoad?: unknown;
      onReady?: unknown;
      onError?: unknown;
    },
  ) {
    const rest = { ...props };
    delete rest.strategy;
    delete rest.onLoad;
    delete rest.onReady;
    delete rest.onError;
    const { children, dangerouslySetInnerHTML, ...dom } = rest;
    return (
      <script {...dom} dangerouslySetInnerHTML={dangerouslySetInnerHTML}>
        {children}
      </script>
    );
  },
}));

describe("GoogleAdSense", () => {
  it("emits Funding Choices then Google’s snippet", () => {
    const html = renderToStaticMarkup(<GoogleAdSense />);
    expect(html).toContain(
      'src="https://fundingchoicesmessages.google.com/i/pub-9835884276920090.js?ers=1"',
    );
    expect(html).toContain("googlefcPresent");
    expect(html).toContain(`src="${adsbygoogleScriptSrc(ADSENSE_CLIENT_ID)}"`);
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
